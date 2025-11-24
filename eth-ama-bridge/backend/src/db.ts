import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILockedEvent extends Document {
  token: string;
  user: string;
  amount: string;
  targetAddress: string;
  timestamp: number;
  txHash: string;
  processedAt: Date;
  isExecutedAmaTx: boolean;
}

const LockedEventSchema = new Schema<ILockedEvent>({
  token: { type: String, required: true, index: true },
  user: { type: String, required: true, index: true },
  amount: { type: String, required: true },
  targetAddress: { type: String, required: true },
  timestamp: { type: Number, required: true },
  txHash: { type: String, required: true, index: true },
  processedAt: { type: Date, required: true, default: () => new Date() },
  isExecutedAmaTx: { type: Boolean, required: true, default: false }
}, {
  timestamps: false
});

// Ensure uniqueness per chain event (txHash + logIndex)
LockedEventSchema.index({ txHash: 1 }, { unique: true });

export const LockedEvent: Model<ILockedEvent> = mongoose.model<ILockedEvent>("LockedEvent", LockedEventSchema);

export interface IBlockPointer extends Document {
  chain: string;
  currentBlock: number;
  lastUpdated: Date;
}

const BlockPointerSchema = new Schema<IBlockPointer>({
  chain: { type: String, required: true, unique: true },
  currentBlock: { type: Number, required: true },
  lastUpdated: { type: Date, required: true, default: () => new Date() }
}, {
  timestamps: false
});

export const BlockPointer: Model<IBlockPointer> = mongoose.model<IBlockPointer>("BlockPointer", BlockPointerSchema);

export async function getBlockPointer(chain: string, defaultBlock: number): Promise<number> {
  const pointer = await BlockPointer.findOne({ chain });
  return pointer ? pointer.currentBlock : defaultBlock;
}

export async function updateBlockPointer(chain: string, currentBlock: number): Promise<void> {
  await BlockPointer.findOneAndUpdate(
    { chain },
    { currentBlock, lastUpdated: new Date() },
    { upsert: true }
  );
}

export async function connectMongo(uri: string): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
}

