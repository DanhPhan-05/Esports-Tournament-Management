import { randomUUID } from "node:crypto";
import { Notification, NotificationTemplate, User } from "../models/index.js";
import { sendEmail } from "./email.service.js";
import { ApiError } from "../utils/ApiError.js";

export const automaticNotificationEvents = {
  APPLICATION_STATUS: { label: "Xét duyệt hồ sơ tham dự", recipients: "Quản lý CLB đã nộp hồ sơ" },
  MATCH_RESULT: { label: "Xác nhận hoặc sửa kết quả trận", recipients: "Quản lý CLB của hai đội thi đấu" },
  REPORT_STATUS: { label: "Cập nhật trạng thái báo cáo", recipients: "Người đã gửi báo cáo" },
  PROTEST_SUBMITTED: { label: "Tiếp nhận khiếu nại", recipients: "Ban tổ chức giải đấu" },
  PROTEST_EVIDENCE: { label: "Yêu cầu bổ sung bằng chứng khiếu nại", recipients: "Người đã gửi khiếu nại" },
  PROTEST_RESOLVED: { label: "Giải quyết khiếu nại", recipients: "Người đã gửi khiếu nại và ban tổ chức" },
};

export function notificationText(value, label, maxLength) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > maxLength) throw new ApiError(422, `${label} cần có từ 1 đến ${maxLength} ký tự.`);
  return text;
}

export function notificationChannel(value) {
  if (!["InApp", "Email", "Both"].includes(value)) throw new ApiError(422, "Kênh gửi không hợp lệ.");
  return value;
}

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
  return item;
}

export async function notify(recipientId, templateKey, data = {}, link = null, options = {}) {
  const template = await NotificationTemplate.findOne({ key: templateKey, isActive: true }).sort({ version: -1 });
  const dedupeKey = `${options.eventKey || randomUUID()}:${recipientId}`;
  const title = template?.subject || options.title || templateKey.replaceAll("_", " ");
  const message = template?.body || options.message || "{{message}}";
  const payload = {
    recipientId, dedupeKey, templateKey, templateId: template?._id,
    title: template?.plainText ? title : renderTemplate(title, data),
    message: template?.plainText ? message : renderTemplate(message, { message: data.message || JSON.stringify(data), ...data }),
    plainText: template?.plainText,
    channel: template?.channel || "Both", link,
    entityType: options.entityType, entityId: options.entityId,
  };
  return publishNotification(payload);
}

export async function publishNotification(payload, { queueEmail = false } = {}) {
  const { dedupeKey } = payload;
  if (payload.channel === "InApp") {
    payload = { ...payload, deliveryStatus: "Sent", sentAt: new Date() };
  }
  let item;
  try { item = await Notification.findOneAndUpdate({ dedupeKey }, { $setOnInsert: payload }, { new: true, upsert: true, runValidators: true }); }
  catch (error) { if (error.code !== 11000) throw error; item = await Notification.findOne({ dedupeKey }); }
  if (item.channel !== "InApp" && !queueEmail) return (await deliverNotification(item._id)) || item;
  return item;
}

export async function broadcastNotification(payload, requestKey) {
  const totals = { recipients: 0, inApp: 0, email: 0, skipped: 0 };
  const users = User.find({ status: "Active" }).select("notificationSettings").lean().cursor();
  const pending = [];
  for await (const user of users) {
    const inApp = payload.channel !== "Email" && user.notificationSettings?.inApp !== false;
    const email = payload.channel !== "InApp" && user.notificationSettings?.email !== false;
    if (!inApp && !email) {
      totals.skipped++;
      continue;
    }

    const channel = inApp && email ? "Both" : inApp ? "InApp" : "Email";
    const dedupeKey = `${requestKey}:${user._id}`;
    pending.push({ ...payload, channel, recipientId: user._id, dedupeKey });
    totals.recipients++;
    if (inApp) totals.inApp++;
    if (email) totals.email++;
    if (pending.length === 25) {
      await Promise.all(pending.splice(0).map((notice) => publishNotification(notice, { queueEmail: true })));
    }
  }
  await Promise.all(pending.map((notice) => publishNotification(notice, { queueEmail: true })));
  return totals;
}

export async function retryNotifications(now = new Date()) {
  const items = await Notification.find({ channel: { $in: ["Email", "Both"] }, attempts: { $lt: 5 }, nextAttemptAt: { $lte: now }, deliveryStatus: { $in: ["Pending", "Failed", "Sending"] } }).limit(100);
  for (const item of items) await deliverNotification(item._id, now);
}
