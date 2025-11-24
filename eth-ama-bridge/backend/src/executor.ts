import axios from "axios";
import { LockedEvent, ILockedEvent } from "./db";
import { build_tx, from_b58, to_b58 } from "./utils";

export interface ExecuteAmaPayload {
  token: string;
  user: string;
  amount: string;
  targetAddress: string;
  timestamp: number;
  txHash: string;
}

/**
 * Call the AMA API with the locked event data
 */
export async function executeAmaApi(event: ILockedEvent): Promise<boolean> {
  try {
    const packed_tx = build_tx(
      "Coin",
      "mint",
      [from_b58(event.targetAddress), Number(Number(event.amount)* 1000000000).toString(), "WUSDT"]
    );
  
    const response = await axios.post(`https://nodes.amadeus.bot/api/tx/submit_and_wait`, packed_tx, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    })
  
    console.log(response.data, "+++++++++++")
    return true;

  } catch (error) {
    console.error("Error executing AMA API:", error);
    return false;
  }
}

/**
 * Mark the event as executed in the database
 */
export async function markAsExecuted(eventId: string): Promise<void> {
  await LockedEvent.findByIdAndUpdate(eventId, {
    isExecutedAmaTx: true,
  });
}

/**
 * Process a single unexecuted event
 */
export async function processUnexecutedEvent(event: ILockedEvent): Promise<void> {
  if (event.isExecutedAmaTx) {
    return; // Already processed
  }

  const success = await executeAmaApi(event);
  
  if (success) {
    await markAsExecuted(event._id.toString());
    console.log(`✅ Marked as executed: ${event.txHash.slice(0, 10)}...`);
  } else {
    console.log(`⚠️  Will retry later: ${event.txHash.slice(0, 10)}...`);
  }
}

/**
 * Start real-time watcher using MongoDB Change Streams
 */
export function startRealtimeExecutor(): void {
  console.log("👂 Starting real-time AMA executor watcher...");

  // Watch for new inserts
  const changeStream = LockedEvent.watch([
    {
      $match: {
        operationType: "insert",
        "fullDocument.isExecutedAmaTx": false,
      },
    },
  ]);

  changeStream.on("change", async (change: any) => {
    if (change.operationType === "insert") {
      const event = change.fullDocument as ILockedEvent;
      console.log(`🔔 New unexecuted event detected: ${event.txHash.slice(0, 10)}...`);
      await processUnexecutedEvent(event);
    }
  });

  changeStream.on("error", (error) => {
    console.error("❌ Change stream error:", error);
    // Attempt to restart after a delay
    setTimeout(() => {
      console.log("🔄 Restarting change stream...");
      startRealtimeExecutor();
    }, 5000);
  });

  console.log("✅ Real-time executor is active");
}

/**
 * Process any existing unexecuted events on startup
 */
export async function processBacklog(): Promise<void> {
  console.log("🔍 Checking for unexecuted events...");
  
  const unexecutedEvents = await LockedEvent.find({
    isExecutedAmaTx: false,
  }).sort({ timestamp: 1 });

  if (unexecutedEvents.length === 0) {
    console.log("✅ No unexecuted events found");
    return;
  }

  console.log(`📋 Found ${unexecutedEvents.length} unexecuted event(s), processing...`);
  
  for (const event of unexecutedEvents) {
    await processUnexecutedEvent(event);
  }

  console.log("✅ Backlog processing complete");
}

/**
 * Optional: Start a periodic check as backup (in case change streams miss anything)
 */
export function startPeriodicCheck(intervalMs: number = 60000): NodeJS.Timeout {
  console.log(`⏰ Starting periodic check every ${intervalMs / 1000}s`);
  
  return setInterval(async () => {
    const unexecutedCount = await LockedEvent.countDocuments({
      isExecutedAmaTx: false,
    });

    if (unexecutedCount > 0) {
      console.log(`⚠️  Periodic check found ${unexecutedCount} unexecuted event(s), processing...`);
      await processBacklog();
    }
  }, intervalMs);
}

