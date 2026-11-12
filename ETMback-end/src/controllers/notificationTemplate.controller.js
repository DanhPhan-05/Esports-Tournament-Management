import { randomUUID } from "node:crypto";
import { NotificationTemplate } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { automaticNotificationEvents, notificationChannel, notificationText } from "../services/notification.service.js";

export function listNotificationEvents(_req, res) {
  const data = Object.entries(automaticNotificationEvents).map(([key, event]) => ({ key, ...event }));
  res.json({ success: true, data });
}

export async function listTemplates(_req, res) {
  const templates = await NotificationTemplate.find().sort({ key: 1, version: -1 });
  const data = templates.map((template) => ({
    ...template.toObject(),
    automaticEvent: Object.hasOwn(automaticNotificationEvents, template.key)
      ? { key: template.key, ...automaticNotificationEvents[template.key] }
      : null,
  }));
  res.json({ success: true, data });
}

export async function saveTemplate(req, res) {
  const original = req.params.id ? await NotificationTemplate.findById(req.params.id) : null;
  if (req.params.id && !original) throw new ApiError(404, "Không tìm thấy mẫu thông báo.");
  const event = original ? (Object.hasOwn(automaticNotificationEvents, original.key) ? original.key : "") : req.body.event || "";
  if (typeof event !== "string" || (event && !Object.hasOwn(automaticNotificationEvents, event))) {
    throw new ApiError(422, "Sự kiện không hợp lệ.");
  }
  const key = original?.key || event || `MANUAL_${randomUUID()}`.toUpperCase();
  const previous = await NotificationTemplate.findOne({ key }).sort({ version: -1 });
  if (original && !previous?._id.equals(original._id)) throw new ApiError(409, "Hãy chỉnh sửa phiên bản mới nhất.");

  const version = (previous?.version || 0) + 1;
  let template;
  try {
    template = await NotificationTemplate.create({
      key, version, event: event || undefined,
      subject: notificationText(req.body.subject, "Tiêu đề", 200),
      body: notificationText(req.body.body, "Nội dung", 5000),
      channel: notificationChannel(req.body.channel ?? previous?.channel ?? "InApp"),
      isActive: req.body.isActive ?? true,
      plainText: true,
    });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, "Mẫu vừa được cập nhật. Hãy tải lại danh sách và thử lại.");
    throw error;
  }
  if (previous) await NotificationTemplate.updateMany({ key, version: { $lt: version }, isActive: true }, { isActive: false });
  res.json({ success: true, data: template });
}
export async function disableTemplate(req, res) {
  const item = await NotificationTemplate.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!item) throw new ApiError(404, "Template not found");
  res.json({ success: true, data: item });
}
