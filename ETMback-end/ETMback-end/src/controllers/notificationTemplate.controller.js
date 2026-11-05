import { NotificationTemplate } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { pick } from "../utils/input.js";

export async function listTemplates(_req, res) {
  res.json({ success: true, data: await NotificationTemplate.find().sort({ key: 1 }) });
}

export async function saveTemplate(req, res) {
  const previous = req.params.id ? await NotificationTemplate.findById(req.params.id) : await NotificationTemplate.findOne({ key: String(req.body.key || "").toUpperCase() }).sort({ version: -1 });
  if (req.params.id && !previous) throw new ApiError(404, "Template not found");
  const template = await NotificationTemplate.create({ ...pick(req.body, ["subject", "body", "channel", "variables", "event", "isActive"]), key: previous?.key || req.body.key, version: (previous?.version || 0) + 1 });
  if (previous) await NotificationTemplate.updateOne({ _id: previous._id }, { isActive: false });
  res.json({ success: true, data: template });
}
export async function disableTemplate(req, res) {
  const item = await NotificationTemplate.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!item) throw new ApiError(404, "Template not found");
  res.json({ success: true, data: item });
}
