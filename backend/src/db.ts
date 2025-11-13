import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILockedEvent extends Document {
  token: string;
  user: string;
  amount: string;
  targetAddress: string;
  timestamp: number;
  txHash: string;
  processedAt: Date;
}

const LockedEventSchema = new Schema<ILockedEvent>({
  token: { type: String, required: true, index: true },
  user: { type: String, required: true, index: true },
  amount: { type: String, required: true },
  targetAddress: { type: String, required: true },
  timestamp: { type: Number, required: true },
  txHash: { type: String, required: true, index: true },
  processedAt: { type: Date, required: true, default: () => new Date() }
}, {
  timestamps: false
});

// Ensure uniqueness per chain event (txHash + logIndex)
LockedEventSchema.index({ txHash: 1 }, { unique: true });

export const LockedEvent: Model<ILockedEvent> = mongoose.model<ILockedEvent>("LockedEvent", LockedEventSchema);

export async function connectMongo(uri: string): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
}

