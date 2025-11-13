# Cross-Chain Bridge Event Listener

A clean, simple TypeScript application that listens to blockchain smart contract events and stores them in MongoDB.

## ✨ Features

- 🔄 Real-time event listening using ethers.js v6
- 📦 Batch syncing of historical events
- 💾 MongoDB storage with automatic duplicate prevention
- 🔒 Type-safe TypeScript with CommonJS modules
- 🎨 Clean console output with emoji indicators
- 🛡️ Graceful shutdown handling

## 📁 Project Structure

```
event-listener/
├── src/
│   ├── index.ts      # Main entry point & orchestration
│   ├── db.ts         # MongoDB models and connection
│   └── listener.ts   # Event parsing and processing
├── dist/             # Compiled JavaScript (after build)
├── tsconfig.json     # TypeScript configuration
├── package.json      # Dependencies and scripts
├── .env              # Environment variables (create from .env.example)
└── README.md         # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-KEY
CONTRACT_ADDRESS=0xYourContractAddress
MONGO_URI=mongodb://localhost:27017/xchain-bridge
FROM_BLOCK=0
BATCH_SIZE=5000
```

### 3. Run

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run in development mode with ts-node |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled JavaScript |
| `npm run watch` | Watch mode for compilation |
| `npm run clean` | Remove dist directory |

## 🔧 Configuration

### Environment Variables

- **RPC_URL** (required): Blockchain RPC endpoint
- **CONTRACT_ADDRESS** (required): Smart contract address to monitor
- **MONGO_URI** (required): MongoDB connection string
- **FROM_BLOCK** (optional): Starting block for historical sync (default: 0)
- **BATCH_SIZE** (optional): Number of blocks per query (default: 5000)

## 📊 Event Schema

The application monitors `Locked` events with this structure:

```solidity
event Locked(
    address indexed token,
    address indexed user,
    uint256 amount,
    string targetAddress,
    uint256 timestamp
)
```

### MongoDB Document

```typescript
{
  token: string;          // Token contract address
  user: string;           // User wallet address
  amount: string;         // Amount (stored as string for precision)
  targetAddress: string;  // Destination address
  timestamp: number;      // Event timestamp
  txHash: string;         // Transaction hash
}
```

**Indexes:**
- Unique: `(txHash)` - prevents duplicates
- Regular: `token`, `user`, `txHash`, `blockNumber`

## 💡 Why This Setup?

### CommonJS vs ES Modules

This project uses **CommonJS** (`module: "CommonJS"`) instead of ES Modules for simplicity:

- ✅ Import paths use regular `.ts` extensions: `import { x } from "./file"`
- ✅ No confusing `.js` extensions in TypeScript files
- ✅ Better compatibility with many Node.js tools
- ✅ Simpler for beginners

### Type Safety

TypeScript with strict mode enabled catches errors at compile time:
- No implicit `any` types
- Null safety checks
- Type inference

## 🛑 Graceful Shutdown

The application handles `SIGINT` (Ctrl+C) and `SIGTERM` signals:
1. Stops listening to events
2. Disconnects from blockchain provider
3. Closes MongoDB connection
4. Exits cleanly

## 📝 Example Output

```
🚀 Starting Cross-Chain Event Listener...

✅ MongoDB connected
✅ Connected to blockchain provider
✅ Contract loaded: 0x1234...

🔄 Syncing past events from block 12345 to 12350 (batch size: 5000)
   Querying blocks 12345 to 12350...
✅ Saved event: tx=0xabcd1234... logIndex=42
⏭️  Duplicate event (already processed): tx=0xef567890...
✅ Past events sync complete

👂 Starting real-time listener for Locked events...

✅ Listener is running. Press Ctrl+C to stop.
```

## 🐛 Troubleshooting

**Connection errors?**
- Verify RPC_URL is correct and accessible
- Check MongoDB is running: `mongod --version`

**Duplicate key errors?**
- Normal! This means the event was already processed
- The unique index prevents duplicates automatically

**Rate limiting?**
- Reduce BATCH_SIZE in `.env`
- Use a paid RPC provider with higher limits

## 📦 Dependencies

- **ethers** (^6.9.0): Ethereum library for blockchain interaction
- **mongoose** (^7.7.0): MongoDB ODM for data persistence
- **dotenv** (^16.6.1): Environment variable management

## 🔐 Security Notes

- Never commit `.env` file to version control
- Use environment-specific RPC endpoints
- Implement rate limiting for production
- Monitor MongoDB storage usage

## 📄 License

ISC

---

Built with ❤️ using TypeScript + MongoDB + ethers.js

