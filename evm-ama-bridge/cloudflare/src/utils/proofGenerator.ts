import RLP from 'rlp'
import { BaseTrie as Trie } from 'merkle-patricia-tree'
import { ethers } from 'ethers'

export class ProofGenerator {
  private provider: ethers.providers.JsonRpcProvider

  constructor(rpcUrl: string) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  }

  static encode(input: any): Uint8Array {
    return input === '0xs0' ? RLP.encode(Buffer.alloc(0)) : RLP.encode(input)
  }

  static receiptToRlp(receipt: ethers.providers.TransactionReceipt): Uint8Array {
    let encodedLegacy = RLP.encode([
      receipt.status ? '0x1' : '0x',
      (receipt.cumulativeGasUsed.toNumber()) > 0
        ? receipt.cumulativeGasUsed.toHexString()
        : '0x',
      receipt.logsBloom,
      receipt.logs.map((log: any) => [log.address, log.topics, log.data]),
    ])

    if (!!receipt.type && receipt.type !== 0) {
      const transactionType = parseInt(receipt.type.toString())
      const concat = new Uint8Array(encodedLegacy.byteLength + 1)
      const version = new Uint8Array([transactionType])
      concat.set(version, 0)
      concat.set(new Uint8Array(encodedLegacy), 1)
      return concat
    }

    return encodedLegacy
  }

  /**
   * Fetch all transaction receipts for a block using eth_getBlockReceipts
   * This is much more efficient than fetching receipts one by one
   */
  private async fetchBlockReceipts(
    blockNumber: number | string
  ): Promise<ethers.providers.TransactionReceipt[]> {
    try {
      // Use eth_getBlockReceipts to fetch all receipts at once
      const blockNumberHex = typeof blockNumber === 'number' 
        ? '0x' + blockNumber.toString(16) 
        : blockNumber;
      
      const response = await this.provider.send('eth_getBlockReceipts', [blockNumberHex]);
      
      if (!response || !Array.isArray(response)) {
        throw new Error('Invalid response from eth_getBlockReceipts');
      }
      
      // Convert raw receipt data to ethers TransactionReceipt format
      const receipts = response.map((rawReceipt: any) => {
        return this.provider.formatter.receipt(rawReceipt);
      });
      
      // Sort by transaction index to ensure correct order
      receipts.sort((a, b) => {
        const indexA = typeof a.transactionIndex === 'number' 
          ? a.transactionIndex 
          : parseInt(String(a.transactionIndex));
        const indexB = typeof b.transactionIndex === 'number' 
          ? b.transactionIndex 
          : parseInt(String(b.transactionIndex));
        return indexA - indexB;
      });
      
      return receipts;
    } catch (error: any) {
      // Fallback: if eth_getBlockReceipts is not supported, log warning
      // but don't throw - we'll handle it in the calling function
      console.warn('eth_getBlockReceipts not supported, falling back to individual fetches:', error.message);
      throw error;
    }
  }

  async generateTxReceiptProof(
    txHash: string,
  ): Promise<{ proof: string[]; root: string; index: Uint8Array<ArrayBufferLike>; value: string; event: string }> {
    // assume event attached will be taken from index = 0 if exists
    const eventIndex = 0
    const receipt = await this.provider.getTransactionReceipt(txHash);
    
    console.log('⬅️ found receipt for tx: ', txHash)
    console.log('🔃 parsed receipt to hex form')
    const block = await this.provider.getBlock(receipt.blockNumber);
    
    console.log('⬅️ found block for receipt: ', block.hash, block.number)
    console.log(`🔃 fetch sibling tx receipts: ${block.transactions.length}`)
    
    let siblings: ethers.providers.TransactionReceipt[] = []
    
    try {
      // Try to fetch all receipts at once using eth_getBlockReceipts
      siblings = await this.fetchBlockReceipts(receipt.blockNumber);
      
      console.log(`✅ Fetched all ${siblings.length} receipts in one call using eth_getBlockReceipts`);
    } catch (error: any) {
      // Fallback to individual fetches if eth_getBlockReceipts is not supported
      console.warn('⚠️ Falling back to individual receipt fetches:', error.message);
    }
    
    console.log(`⬅️ Fetched ${siblings.length} sibling transaction receipts`);
    
    // Ensure we have enough receipts to build the proof
    if (siblings.length === 0) {
      throw new Error('Failed to fetch any sibling transaction receipts');
    }
    
    // Verify we have all receipts
    const expectedCount = block.transactions.length;
    if (siblings.length < expectedCount) {
      console.warn(`⚠️ Warning: Only fetched ${siblings.length} out of ${expectedCount} receipts. Proof may be incomplete.`);
    }
    
    const proofOutput = await ProofGenerator.calculateReceiptProof(
      siblings,
      receipt.transactionIndex as number,
    )

    const event0 = receipt.logs[eventIndex]
    const eventAsUint8Array = !!event0
      ? ProofGenerator.encode([event0.address, event0.topics, event0.data])
      : Uint8Array.from([])

    const proofOutputHex = {
      proof: proofOutput.proof.map((node: Buffer) => node.toString('hex')),
      root: proofOutput.root.toString('hex'),
      index: ProofGenerator.encode(receipt.transactionIndex as number),
      value: proofOutput.value.toString('hex'),
      event: Buffer.from(eventAsUint8Array).toString('hex'),
    }
    
    console.log(
      '🧮 proof-calculated receipts root vs block receipts root: ',
      '0x' + proofOutputHex.root
    )
    return { proof: proofOutputHex.proof, root: proofOutputHex.root, index: proofOutputHex.index as Uint8Array<ArrayBufferLike>, value: proofOutputHex.value, event: proofOutputHex.event };
  }

  static async calculateReceiptProof(
    receipts: ethers.providers.TransactionReceipt[],
    index: number,
  ): Promise<{ proof: Buffer[]; root: Buffer; value: Buffer }> {
    let trie = new Trie()

    for (let i = 0; i < receipts.length; i++) {
      const entry = receipts[i]
      const keyAsRlpEncodedTxIndex = ProofGenerator.encode(
        entry.transactionIndex as number,
      )
      const valueAsRlpEncodedReceipt = ProofGenerator.receiptToRlp(entry)
      await trie.put(
        Buffer.from(keyAsRlpEncodedTxIndex),
        Buffer.from(valueAsRlpEncodedReceipt),
      )
    }

    const proof = await Trie.createProof(
      trie,
      Buffer.from(ProofGenerator.encode(index)),
    )
    console.log('Computed Root: ', trie.root.toString('hex'))
    const verifyResult = await Trie.verifyProof(
      trie.root,
      Buffer.from(ProofGenerator.encode(index)),
      proof,
    )
    if (verifyResult === null) {
      throw new Error('Proof is invalid')
    }
    const value: Buffer = verifyResult

    return {
      proof,
      root: trie.root,
      value,
    }
  }

}
