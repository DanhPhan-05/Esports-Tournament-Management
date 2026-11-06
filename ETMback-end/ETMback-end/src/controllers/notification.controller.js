import { Notification } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { pagination } from "../utils/pagination.js";

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
