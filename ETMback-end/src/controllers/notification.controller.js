import mongoose from "mongoose";
import { Notification, NotificationTemplate, User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { pagination } from "../utils/pagination.js";
import { broadcastNotification, notificationChannel, notificationText, publishNotification } from "../services/notification.service.js";

export async function sendNotification(req, res) {
  const { audience = "account", recipientId, templateId, requestId } = req.body;
  if (!["account", "all"].includes(audience)) throw new ApiError(422, "Đối tượng nhận không hợp lệ.");
  if (audience === "account" && !mongoose.isObjectIdOrHexString(recipientId)) throw new ApiError(422, "Vui lòng chọn người nhận.");
  if (typeof requestId !== "string" || !/^[\da-f]{36}$/i.test(requestId)) throw new ApiError(422, "Mã yêu cầu gửi không hợp lệ.");
  const dedupeKey = `manual:${req.user._id}:${requestId.toLowerCase()}`;
  if (audience === "account") {
    const existing = await Notification.findOne({ dedupeKey }).select("_id deliveryStatus");
    if (existing) return res.json({ success: true, data: { id: existing._id, deliveryStatus: existing.deliveryStatus } });
  }

  let template;
  if (templateId) {
    if (!mongoose.isObjectIdOrHexString(templateId)) throw new ApiError(422, "Mẫu thông báo không hợp lệ.");
    template = await NotificationTemplate.findOne({ _id: templateId, isActive: true });
    if (!template) throw new ApiError(422, "Vui lòng chọn mẫu thông báo đang hoạt động.");
  }

  const channel = notificationChannel(req.body.channel ?? template?.channel ?? "InApp");
  const payload = {
    channel, plainText: true, templateId: template?._id, templateKey: template?.key,
    title: notificationText(req.body.title ?? (template?.plainText ? template.subject : undefined), "Tiêu đề", 200),
    message: notificationText(req.body.message ?? (template?.plainText ? template.body : undefined), "Nội dung", 5000),
  };
  if (audience === "all") {
    const data = await broadcastNotification(payload, `${dedupeKey}:all`);
    return res.status(201).json({ success: true, data });
  }

  const recipient = await User.findOne({ _id: recipientId, status: "Active" }).select("notificationSettings");
  if (!recipient) throw new ApiError(422, "Tài khoản người nhận cần đang hoạt động.");
  const wantsInApp = channel !== "Email";
  const wantsEmail = channel !== "InApp";
  if ((wantsInApp && recipient.notificationSettings?.inApp === false) ||
      (wantsEmail && recipient.notificationSettings?.email === false)) {
    throw new ApiError(422, "Người nhận đã tắt kênh gửi này. Vui lòng chọn kênh khác.");
  }
  const item = await publishNotification({ ...payload, recipientId: recipient._id, dedupeKey });
  res.status(201).json({ success: true, data: { id: item._id, deliveryStatus: item.deliveryStatus } });
}

export async function listNotifications(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = { recipientId: req.user._id };
  if (req.query.unread === "true") filter.readAt = null;
  if (req.query.channel) filter.channel = { $in: [req.query.channel, "Both"] };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, readAt: null }),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total }, unread });
}

export async function markNotificationRead(req, res) {
  const item = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.user._id },
    { readAt: new Date() },
    { new: true },
  );
  if (!item) throw new ApiError(404, "Notification not found");
  res.json({ success: true, data: item });
}
