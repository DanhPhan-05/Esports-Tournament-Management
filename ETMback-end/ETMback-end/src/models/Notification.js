import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  templateKey: String,
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: "NotificationTemplate" },
  dedupeKey: { type: String, unique: true, sparse: true },
  channel: { type: String, enum: ["InApp", "Email", "Both"], default: "InApp" },
  entityType: String,
  entityId: mongoose.Schema.Types.ObjectId,
  deliveryStatus: { type: String, enum: ["Pending", "Sending", "Sent", "Failed", "Skipped"], default: "Pending" },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  leaseUntil: Date,
  lastError: String,
  sentAt: Date,
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: String,
  readAt: Date,
}, { timestamps: true });

export const Notification = mongoose.model("Notification", notificationSchema);
