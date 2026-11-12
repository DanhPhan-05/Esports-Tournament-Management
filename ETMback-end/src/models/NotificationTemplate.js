import mongoose from "mongoose";

const notificationTemplateSchema = new mongoose.Schema({
  key: { type: String, required: true, uppercase: true },
  version: { type: Number, default: 1, min: 1 },
  event: String,
  subject: { type: String, required: true },
  body: { type: String, required: true },
  channel: { type: String, enum: ["InApp", "Email", "Both"], default: "InApp" },
  variables: [String],
  plainText: Boolean,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

notificationTemplateSchema.index({ key: 1, version: 1 }, { unique: true });
export const NotificationTemplate = mongoose.model("NotificationTemplate", notificationTemplateSchema);
