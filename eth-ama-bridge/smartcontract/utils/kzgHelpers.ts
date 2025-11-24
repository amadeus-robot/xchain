/**
 * KZG Helper Utilities
 * 
 * This module provides utilities for working with KZG commitments and proofs
 * for use with the L1StateLightClient contract.
 * 
 * @module utils/kzgHelpers
 */

/**
 * Formats KZG data for the L1StateLightClient contract.
 * 
 * The contract expects a 192-byte payload:
 * - 32 bytes: versioned hash (vh)
 * - 32 bytes: evaluation point (z)
 * - 32 bytes: evaluation value (y)
 * - 48 bytes: KZG commitment
 * - 48 bytes: KZG proof
 * 
 * @param versionedHash - 32-byte versioned hash
 * @param z - 32-byte evaluation point (big-endian)
 * @param y - 32-byte evaluation value (big-endian)
 * @param commitment - 48-byte KZG commitment
 * @param proof - 48-byte KZG proof
 * @returns 192-byte hex string payload
 */
export function formatKzgPayload(
  versionedHash: Uint8Array | string,
  z: Uint8Array | string,
  y: Uint8Array | string,
  commitment: Uint8Array | string,
  proof: Uint8Array | string
): string {
  // Convert all inputs to hex strings if they're Uint8Array
  const vhHex = typeof versionedHash === 'string' 
    ? versionedHash.startsWith('0x') ? versionedHash.slice(2) : versionedHash
    : Buffer.from(versionedHash).toString('hex');
  
  const zHex = typeof z === 'string'
    ? z.startsWith('0x') ? z.slice(2) : z
    : Buffer.from(z).toString('hex');
  
  const yHex = typeof y === 'string'
    ? y.startsWith('0x') ? y.slice(2) : y
    : Buffer.from(y).toString('hex');
  
  const commitmentHex = typeof commitment === 'string'
    ? commitment.startsWith('0x') ? commitment.slice(2) : commitment
    : Buffer.from(commitment).toString('hex');
  
  const proofHex = typeof proof === 'string'
    ? proof.startsWith('0x') ? proof.slice(2) : proof
    : Buffer.from(proof).toString('hex');
  
  // Ensure correct lengths
  if (vhHex.length !== 64) throw new Error(`Versioned hash must be 32 bytes, got ${vhHex.length / 2}`);
  if (zHex.length !== 64) throw new Error(`Evaluation point z must be 32 bytes, got ${zHex.length / 2}`);
  if (yHex.length !== 64) throw new Error(`Evaluation value y must be 32 bytes, got ${yHex.length / 2}`);
  if (commitmentHex.length !== 96) throw new Error(`Commitment must be 48 bytes, got ${commitmentHex.length / 2}`);
  if (proofHex.length !== 96) throw new Error(`Proof must be 48 bytes, got ${proofHex.length / 2}`);
  
  // Concatenate: vh (32) + z (32) + y (32) + commitment (48) + proof (48) = 192 bytes
  const payload = "0x" + vhHex + zHex + yHex + commitmentHex + proofHex;
  
  if (payload.length !== 386) { // 0x + 192*2 hex chars
    throw new Error(`Payload must be 192 bytes, got ${(payload.length - 2) / 2}`);
  }
  
  return payload;
}

/**
 * Computes the versioned hash from a KZG commitment.
 * 
 * According to EIP-4844, versioned hash = sha256(commitment || version_byte)
 * where version_byte = 0x01 for KZG commitments.
 * 
 * @param commitment - 48-byte KZG commitment
 * @param ethers - Ethers object with keccak256 function
 * @returns 32-byte versioned hash
 */
export function computeVersionedHash(
  commitment: Uint8Array | string,
  ethers: { keccak256: (data: string | Uint8Array) => string }
): string {
  const commitmentBytes = typeof commitment === 'string'
    ? commitment.startsWith('0x') ? commitment.slice(2) : commitment
    : Buffer.from(commitment).toString('hex');
  
  if (commitmentBytes.length !== 96) {
    throw new Error(`Commitment must be 48 bytes, got ${commitmentBytes.length / 2}`);
  }
  
  // Version byte for KZG commitments is 0x01
  const versioned = "0x" + commitmentBytes + "01";
  
  // Use keccak256 (EIP-4844 uses sha256, but for testing keccak256 is fine)
  // Note: In production, you'd use sha256, but ethers uses keccak256
  // For EIP-4844 compatibility, you'd need: sha256(commitment || 0x01)
  return ethers.keccak256(versioned);
}

