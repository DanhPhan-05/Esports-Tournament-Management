import { Ban, Club, User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { hashCitizenId } from "../utils/crypto.js";
import { pick, requireText } from "../utils/input.js";
import { pagination } from "../utils/pagination.js";

/**
 * =========================================================================================
 * @function createBan
 * @description Admin ban hành lệnh cấm (án phạt kỷ luật) đối với đối tượng vi phạm.
 *              - Hỗ trợ 3 loại đối tượng cấm (targetType):
 *                1. "Account": Cấm tài khoản người dùng cụ thể (kiểm tra User tồn tại).
 *                2. "Club": Cấm toàn bộ tổ chức Câu lạc bộ (kiểm tra Club tồn tại).
 *                3. "Individual": Cấm cá nhân vận động viên $\rightarrow$ Nhập số CCCD (citizenId),
 *                   hệ thống tự động băm bảo mật bằng `hashCitizenId` để chỉ lưu mã băm `citizenIdHash`
 *                   và 4 số cuối `citizenIdLast4` nhằm bảo vệ quyền riêng tư dữ liệu cá nhân.
 *              - Thiết lập phạm vi cấm (scope: Global toàn hệ thống hoặc theo giải) và thời hạn cấm (startsAt, endsAt).
 *              - Khi có lệnh cấm hiệu lực, BanService sẽ tự động chặn đối tượng khi đăng ký giải hoặc gán vào Roster.
 * @route POST /api/admin/bans
 * @access Private (Administrator)
 * =========================================================================================
 */
export async function createBan(req, res) {
  const data = { ...pick(req.body, ["targetType", "accountId", "clubId", "reason", "startsAt", "endsAt", "scope"]), createdBy: req.user._id };
  
  if (req.body.targetType === "Individual") Object.assign(data, hashCitizenId(req.body.citizenId));
  if (data.targetType === "Account" && !await User.exists({ _id: data.accountId })) throw new ApiError(422, "Account target does not exist");
  if (data.targetType === "Club" && !await Club.exists({ _id: data.clubId })) throw new ApiError(422, "Club target does not exist");
  
  delete data.citizenId;
  const ban = await Ban.create(data);
  res.status(201).json({ success: true, data: ban });
}

/**
 * =========================================================================================
 * @function listBans
 * @description Lấy danh sách toàn bộ các lệnh cấm trong hệ thống.
 *              - Hỗ trợ lọc theo loại đối tượng (targetType) và trạng thái (status: "Active", "Revoked", "Expired").
 *              - Ẩn trường citizenIdHash để bảo mật, chỉ hiển thị citizenIdLast4.
 *              - Hỗ trợ phân trang page / limit.
 * @route GET /api/admin/bans
 * @access Private (Administrator)
 * =========================================================================================
 */
export async function listBans(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = pick(req.query, ["targetType", "status"]);
  const [items, total] = await Promise.all([
    Ban.find(filter).select("-citizenIdHash").sort({ createdAt: -1 }).skip(skip).limit(limit), 
    Ban.countDocuments(filter)
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total } });
}

/**
 * =========================================================================================
 * @function updateBan
 * @description Chỉnh sửa thông tin lệnh cấm đang có hiệu lực.
 *              - Cho phép cập nhật lại lý do vi phạm (reason), thời gian kết thúc án phạt (endsAt), hoặc phạm vi cấm (scope).
 *              - Chỉ cho phép sửa đổi các án phạt đang ở trạng thái "Active".
 * @route PUT /api/admin/bans/:id
 * @access Private (Administrator)
 * =========================================================================================
 */
export async function updateBan(req, res) {
  const ban = await Ban.findById(req.params.id);
  if (!ban) throw new ApiError(404, "Ban not found");
  if (ban.status !== "Active") throw new ApiError(409, "Only active bans can be edited");
  
  requireText(req.body.reason);
  Object.assign(ban, pick(req.body, ["reason", "endsAt", "scope"]));
  await ban.save(); 
  
  res.json({ success: true, data: ban });
}

/**
 * =========================================================================================
 * @function revokeBan
 * @description Thu hồi / Gỡ bỏ lệnh cấm (Ân xá trước thời hạn).
 *              - Chuyển trạng thái lệnh cấm từ "Active" sang "Revoked".
 *              - Lưu thông tin Admin thực hiện gỡ cấm (revokedBy) và thời điểm gỡ cấm (revokedAt).
 *              - Đối tượng sau khi được gỡ cấm có thể tham gia lại các giải đấu bình thường.
 * @route DELETE /api/admin/bans/:id (hoặc PATCH /api/admin/bans/:id/revoke)
 * @access Private (Administrator)
 * =========================================================================================
 */
export async function revokeBan(req, res) {
  const ban = await Ban.findOneAndUpdate(
    { _id: req.params.id, status: "Active" }, 
    { status: "Revoked", revokedBy: req.user._id, revokedAt: new Date() }, 
    { new: true }
  );
  if (!ban) throw new ApiError(404, "Active ban not found");
  res.json({ success: true, data: ban });
}
