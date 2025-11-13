import { Contract, EventLog } from "ethers";
import { LockedEvent } from "./db";

export interface ParsedLockedEvent {
  token: string;
  user: string;
  amount: string;
  targetAddress: string;
  timestamp: number;
  txHash: string;
}

/**
 * Parse an ethers event into our structure
 */
export function parseLockedEvent(log: any): ParsedLockedEvent {
  const args = log.args as any;
  return {
    token: args.token.toString(),
    user: args.user.toString(),
    amount: args.amount.toString(),
    targetAddress: args.targetAddress,
    timestamp: Number(args.timestamp.toString()),
    txHash: log.transactionHash,
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
    console.log(`✅ Saved event: tx=${parsed.txHash.slice(0, 10)}...`);
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
    console.log(args, "+++++++++++++++++++");
    console.log(event, "===================");
    const parsed = parseLockedEvent(event);
    console.log(parsed, "*******************");
    await saveLockedEvent(parsed);
  });

  contract.on("Unlocked", async (...args: any[]) => {
    console.log(args)
  });
}

