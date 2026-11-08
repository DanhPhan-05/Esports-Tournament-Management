import { randomUUID } from "node:crypto";
import { Notification, NotificationTemplate, User } from "../models/index.js";
import { sendEmail } from "./email.service.js";

export function renderTemplate(text, data) {
  return String(text).replace(/\{\{(\w+)\}\}/g, (_whole, key) => String(data[key] ?? ""));
}

export async function deliverNotification(id, now = new Date(), send = sendEmail) {
  const item = await Notification.findOneAndUpdate({
    _id: id, channel: { $in: ["Email", "Both"] }, attempts: { $lt: 5 }, nextAttemptAt: { $lte: now },
    $or: [{ deliveryStatus: { $in: ["Pending", "Failed"] } }, { deliveryStatus: "Sending", leaseUntil: { $lte: now } }],
  }, { $set: { deliveryStatus: "Sending", leaseUntil: new Date(now.getTime() + 60000) }, $inc: { attempts: 1 } }, { new: true });
  if (!item) return;
  try {
    const user = await User.findById(item.recipientId);
    if (!user || user.status === "Inactive" || user.notificationSettings?.email === false) {
      item.deliveryStatus = "Skipped";
    } else {
      const response = await send({ to: user.email, subject: item.title, text: item.message });
      item.deliveryStatus = response.skipped ? "Skipped" : "Sent";
      if (!response.skipped) item.sentAt = new Date();
    }
    item.lastError = undefined;
  } catch (error) {
    item.deliveryStatus = "Failed";
    item.lastError = String(error.code || "EMAIL_DELIVERY_FAILED");
    item.nextAttemptAt = new Date(now.getTime() + Math.min(3600000, 30000 * 2 ** item.attempts));
  }
  item.leaseUntil = undefined;
  await item.save();
}

export async function notify(recipientId, templateKey, data = {}, link = null, options = {}) {
  const template = await NotificationTemplate.findOne({ key: templateKey, isActive: true }).sort({ version: -1 });
  const dedupeKey = `${options.eventKey || randomUUID()}:${recipientId}`;
  const payload = {
    recipientId, dedupeKey, templateKey, templateId: template?._id,
    title: renderTemplate(template?.subject || options.title || templateKey.replaceAll("_", " "), data),
    message: renderTemplate(template?.body || options.message || "{{message}}", { message: data.message || JSON.stringify(data), ...data }),
    channel: template?.channel || "Both", link,
    entityType: options.entityType, entityId: options.entityId,
  };
  let item;
  try { item = await Notification.findOneAndUpdate({ dedupeKey }, { $setOnInsert: payload }, { new: true, upsert: true, runValidators: true }); }
  catch (error) { if (error.code !== 11000) throw error; item = await Notification.findOne({ dedupeKey }); }
  if (item.channel === "InApp" && item.deliveryStatus === "Pending") {
    item.deliveryStatus = "Sent"; item.sentAt = new Date(); await item.save();
  } else await deliverNotification(item._id);
  return item;
}

export async function retryNotifications(now = new Date()) {
  const items = await Notification.find({ channel: { $in: ["Email", "Both"] }, attempts: { $lt: 5 }, nextAttemptAt: { $lte: now }, deliveryStatus: { $in: ["Pending", "Failed", "Sending"] } }).limit(100);
  for (const item of items) await deliverNotification(item._id, now);
}
