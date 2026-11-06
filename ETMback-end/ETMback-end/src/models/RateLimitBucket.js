import mongoose from "mongoose";
const schema = new mongoose.Schema({ key: { type: String, required: true, unique: true }, count: { type: Number, default: 0 }, expiresAt: { type: Date, required: true, index: { expires: 0 } } });
export const RateLimitBucket = mongoose.model("RateLimitBucket", schema);
