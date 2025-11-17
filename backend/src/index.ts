import "dotenv/config";
import { ethers } from "ethers";
import { connectMongo, getBlockPointer } from "./db";
import { startRealtimeListener, syncPastEvents } from "./listener";
import { startRealtimeExecutor, processBacklog, startPeriodicCheck } from "./executor";

import ABI from "./abi/TokenLockForAMA.json";

async function main(): Promise<void> {
  console.log("🚀 Starting Cross-Chain Event Listener...\n");

  // Load environment variables
  const RPC_URL = process.env.RPC_URL;
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  const MONGO_URI = process.env.MONGO_URI;
  const FROM_BLOCK = process.env.FROM_BLOCK ? parseInt(process.env.FROM_BLOCK, 10) : 0;
  const BATCH_SIZE = process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE, 10) : 5000;

  // Validate required environment variables
  if (!RPC_URL || !CONTRACT_ADDRESS || !MONGO_URI) {
    console.error("❌ Missing required environment variables!");
    console.error("   Please copy .env.example to .env and configure:");
    console.error("   - RPC_URL");
    console.error("   - CONTRACT_ADDRESS");
    console.error("   - MONGO_URI");
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    await connectMongo(MONGO_URI);

    // Setup blockchain provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    console.log("✅ Connected to blockchain provider");

    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    console.log(`✅ Contract loaded: ${CONTRACT_ADDRESS}\n`);

    // Get the block pointer from DB (or use FROM_BLOCK as default for first run)
    const fromBlock = await getBlockPointer("ethereum", FROM_BLOCK);
    console.log(`📍 Starting sync from block: ${fromBlock}\n`);

    // Sync past events (safe to run on every start)
    await syncPastEvents(contract, fromBlock, BATCH_SIZE);
    console.log("");

    // Process any existing unexecuted events
    await processBacklog();
    console.log("");

    // Start real-time event listener
    startRealtimeListener(contract);
    console.log("");

    // Start real-time AMA executor
    startRealtimeExecutor();
    
    // Start periodic backup check (optional, runs every 5 minutes)
    startPeriodicCheck(300000);

    console.log("\n✅ All services running. Press Ctrl+C to stop.\n");

    // Graceful shutdown handler
    const shutdown = async () => {
      console.log("\n\n🛑 Shutting down gracefully...");
      
      try {
        await provider.destroy();
        console.log("✅ Provider disconnected");
      } catch (err) {
        console.error("⚠️  Error disconnecting provider:", err);
      }

      try {
        const mongoose = await import("mongoose");
        await mongoose.disconnect();
        console.log("✅ MongoDB disconnected");
      } catch (err) {
        console.error("⚠️  Error disconnecting MongoDB:", err);
      }

      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Unhandled error:", err);
  process.exit(1);
});

