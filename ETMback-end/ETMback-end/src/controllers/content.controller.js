import { Content } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { pagination } from "../utils/pagination.js";
import { pick, searchText } from "../utils/input.js";

/**
 * =========================================================================================
 * @function listContent
 * @description Lấy danh sách các bài viết / nội dung tin tức, hướng dẫn trong hệ thống.
 *              - Hỗ trợ lọc theo loại bài viết (type: "News", "Announcement", "Rulebook", "Guide")
 *                và trạng thái (status: "Draft", "Published", "Archived").
 *              - Hỗ trợ tìm kiếm tiêu đề bài viết theo từ khóa (search regex không phân biệt hoa thường).
 *              - Hỗ trợ phân trang page / limit.
 * @route GET /api/admin/content (hoặc /api/content)
 * @access Private (Administrator) / Public (đối với bài Published)
 * =========================================================================================
 */
export async function listContent(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = pick(req.query, ["type", "status"]);
  if (req.query.search) filter.title = { $regex: searchText(req.query.search), $options: "i" };
  
  const [items, total] = await Promise.all([
    Content.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), 
    Content.countDocuments(filter)
  ]);
  
  res.json({ success: true, data: items, pagination: { page, limit, total } });
}

/**
 * =========================================================================================
 * @function getContent
 * @description Lấy nội dung chi tiết của một bài viết cụ thể theo ID.
 * @route GET /api/admin/content/:id
 * @access Private (Administrator)
 * =========================================================================================
 */
export async function getContent(req, res) {
  const item = await Content.findById(req.params.id);
  if (!item) throw new ApiError(404, "Content not found");
  res.json({ success: true, data: item });
}

/**
 * =========================================================================================
 * @function saveContent
 * @description Tạo mới bài viết hoặc cập nhật bài viết hiện có.
 *              - Nếu có req.params.id: Cập nhật bài viết tương ứng.
 *              - Nếu không có ID: Khởi tạo bài viết mới gán createdBy = req.user._id.
 *              - Hỗ trợ cập nhật: title, slug, type, summary, body, imageUrl (ảnh banner), videoUrl, status.
 *              - Khi chuyển status sang "Published": Tự động đóng dấu mốc thời gian xuất bản publishedAt.
 * @route POST /api/admin/content (tạo mới) hoặc PUT /api/admin/content/:id (cập nhật)
 * @access Private (Administrator)
 * =========================================================================================
 */
export async function saveContent(req, res) {
  const item = req.params.id ? await Content.findById(req.params.id) : new Content({ createdBy: req.user._id });
  if (!item) throw new ApiError(404, "Content not found");
  
  Object.assign(item, pick(req.body, ["title", "slug", "type", "summary", "body", "imageUrl", "videoUrl", "status"]), { updatedBy: req.user._id });
  if (item.status === "Published" && !item.publishedAt) item.publishedAt = new Date();
  
  await item.save(); 
  res.status(req.params.id ? 200 : 201).json({ success: true, data: item });
}

/**
 * =========================================================================================
 * @function archiveContent
 * @description Lưu trữ / Ẩn bài viết khỏi trang chủ công khai (Soft Delete / Archive).
 *              - Đổi trạng thái bài viết thành "Archived" và ghi nhận người thực hiện.
 * @route DELETE /api/admin/content/:id
 * @access Private (Administrator)
 * =========================================================================================
 */
export async function archiveContent(req, res) {
  const item = await Content.findByIdAndUpdate(req.params.id, { status: "Archived", updatedBy: req.user._id }, { new: true });
  if (!item) throw new ApiError(404, "Content not found");
  res.json({ success: true, data: item });
}
