import { ethers, Contract, EventLog } from "ethers";
import { LockedEvent } from "./db";

const ABI = [
  "event Locked(address indexed token, address indexed user, uint256 amount, string targetAddress, uint256 timestamp)"
];

export interface ParsedLockedEvent {
  token: string;
  user: string;
  amount: string;
  targetAddress: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  raw?: any;
}

/**
 * Create contract instance
 */
export function createContract(provider: ethers.JsonRpcProvider, address: string): Contract {
  return new ethers.Contract(address, ABI, provider);
}

/**
 * Parse an ethers event into our structure
 */
export function parseLockedEvent(log: EventLog): ParsedLockedEvent {
  const args = log.args as any;
  return {
    token: args.token.toString(),
    user: args.user.toString(),
    amount: args.amount.toString(),
    targetAddress: args.targetAddress,
    timestamp: Number(args.timestamp.toString()),
    txHash: log.transactionHash,
    blockNumber: Number(log.blockNumber),
    logIndex: Number(log.index),
    raw: {
      topics: log.topics,
      data: log.data
    }
  };
}

/**
 * Save parsed event to MongoDB (idempotent due to unique index)
 */
export async function saveLockedEvent(parsed: ParsedLockedEvent): Promise<void> {
  try {
    await LockedEvent.create({
      ...parsed,
      processedAt: new Date()
    });
    console.log(`✅ Saved event: tx=${parsed.txHash.slice(0, 10)}... logIndex=${parsed.logIndex}`);
  } catch (err: any) {
    if (err.code === 11000) {
      console.log(`⏭️  Duplicate event (already processed): tx=${parsed.txHash.slice(0, 10)}...`);
    } else {
      console.error("❌ Failed to save event:", err.message);
    }
  }
}

/**
 * Sync past events from fromBlock to latest in batches
 */
export async function syncPastEvents(
  contract: Contract,
  fromBlock: number,
  batchSize: number = 5000
): Promise<void> {
  const provider = contract.runner?.provider;
  if (!provider) throw new Error("No provider found on contract");

  let start = fromBlock;
  const latest = await provider.getBlockNumber();
  
  console.log(`🔄 Syncing past events from block ${start} to ${latest} (batch size: ${batchSize})`);

  while (start <= latest) {
    const end = Math.min(start + batchSize - 1, latest);
    console.log(`   Querying blocks ${start} to ${end}...`);
    
    const filter = contract.filters.Locked();
    const events = await contract.queryFilter(filter, start, end);
    
    for (const event of events) {
      const parsed = parseLockedEvent(event as EventLog);
      await saveLockedEvent(parsed);
    }
    
    start = end + 1;
  }
  
  console.log("✅ Past events sync complete");
}

/**
 * Start real-time listener for new events
 */
export function startRealtimeListener(contract: Contract): void {
  console.log("👂 Starting real-time listener for Locked events...");
  
  contract.on("Locked", async (...args: any[]) => {
    const event = args[args.length - 1] as EventLog;
    const parsed = parseLockedEvent(event);
    await saveLockedEvent(parsed);
  });

  contract.on("error", (err: any) => {
    console.error("❌ Contract listener error:", err);
  });
}

