import { Content } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { pagination } from "../utils/pagination.js";
import { pick, searchText } from "../utils/input.js";

export async function listContent(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = pick(req.query, ["type", "status"]);
  if (req.query.search) filter.title = { $regex: searchText(req.query.search), $options: "i" };
  const [items, total] = await Promise.all([Content.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), Content.countDocuments(filter)]);
  res.json({ success: true, data: items, pagination: { page, limit, total } });
}
export async function getContent(req, res) {
  const item = await Content.findById(req.params.id);
  if (!item) throw new ApiError(404, "Content not found");
  res.json({ success: true, data: item });
}
export async function saveContent(req, res) {
  const item = req.params.id ? await Content.findById(req.params.id) : new Content({ createdBy: req.user._id });
  if (!item) throw new ApiError(404, "Content not found");
  Object.assign(item, pick(req.body, ["title", "slug", "type", "summary", "body", "imageUrl", "videoUrl", "status"]), { updatedBy: req.user._id });
  if (item.status === "Published" && !item.publishedAt) item.publishedAt = new Date();
  await item.save(); res.status(req.params.id ? 200 : 201).json({ success: true, data: item });
}
export async function archiveContent(req, res) {
  const item = await Content.findByIdAndUpdate(req.params.id, { status: "Archived", updatedBy: req.user._id }, { new: true });
  if (!item) throw new ApiError(404, "Content not found");
  res.json({ success: true, data: item });
}
