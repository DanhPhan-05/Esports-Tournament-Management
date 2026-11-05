import { ViolationReport, Match, Team, Club, Bracket, Tournament } from "../models/index.js";
import { REPORT_CATEGORIES } from "../models/ViolationReport.js";
import { ApiError } from "../utils/ApiError.js";
import { evidence, objectId, pick, requireText } from "../utils/input.js";
import { pagination } from "../utils/pagination.js";
import { notify } from "../services/notification.service.js";

/**
 * =========================================================================================
 * @function createReport
 * @description Quản lý Câu lạc bộ gửi báo cáo tố cáo vi phạm liên quan đến một trận đấu cụ thể lên Admin.
 *              - Kiểm tra quyền: Chỉ ClubManager tham gia trận đấu đó mới được quyền tố cáo.
 *              - Kiểm tra trận đấu: Phải thuộc nhánh đấu đã công bố (Published) và giải đấu hợp lệ.
 *              - Phân loại vi phạm theo danh mục hợp lệ trong REPORT_CATEGORIES (Hack/Cheat, gian lận kết quả, phi thể thao).
 *              - Đính kèm mảng đường dẫn bằng chứng (evidenceUrls: ảnh, video).
 * @route POST /api/reports
 * @access Private (ClubManager)
 * =========================================================================================
 */
export async function createReport(req, res) {
  if (req.user.systemRole !== "ClubManager") throw new ApiError(403, "Only club managers can report a match");
  if (req.body.targetType !== "Match") throw new ApiError(422, "Reports must refer to a specific match");
  if (!REPORT_CATEGORIES.includes(req.body.category)) throw new ApiError(422, "Select a match result or rule violation category");
  
  objectId(req.body.targetId);
  const match = await Match.findById(req.body.targetId);
  if (!match) throw new ApiError(404, "Match not found");
  
  const tournament = await Tournament.findOne({ _id: match.tournamentId, status: { $nin: ["Draft", "Cancelled"] } });
  if (!tournament || !await Bracket.exists({ _id: match.bracketId, status: "Published" }) || match.enabled === false || match.isBye || match.status === "Cancelled") {
    throw new ApiError(409, "Match is not available for reporting");
  }
  
  const clubIds = await Team.find({ _id: { $in: [match.teamAId, match.teamBId].filter(Boolean) } }).distinct("clubId");
  if (!await Club.exists({ _id: { $in: clubIds }, managerAccountIds: req.user._id })) {
    throw new ApiError(403, "Only a manager of a participating club can report this match");
  }
  
  const report = await ViolationReport.create({
    targetType: "Match",
    targetId: match._id,
    category: req.body.category,
    description: requireText(req.body.description, "Description"), 
    evidenceUrls: evidence(req.body.evidenceUrls), 
    reporterId: req.user._id 
  });
  
  res.status(201).json({ success: true, data: report });
}

/**
 * =========================================================================================
 * @function listReports
 * @description Admin xem danh sách toàn bộ các báo cáo vi phạm trong hệ thống.
 *              - Tự động nối thông tin người báo cáo (reporterId) và ngữ cảnh trận đấu (giải đấu, 2 đội thi đấu).
 *              - Hỗ trợ lọc theo trạng thái (status: "Submitted", "UnderReview", "Resolved", "Rejected") và danh mục (category).
 * @route GET /api/admin/reports
 * @access Private (Administrator)
 * =========================================================================================
 */
export async function listReports(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = { ...pick(req.query, ["status", "category"]), targetType: "Match" };
  
  const [items, total] = await Promise.all([
    ViolationReport.find(filter)
      .populate("reporterId", "fullName email")
      .populate(matchContext)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit), 
    ViolationReport.countDocuments(filter)
  ]);
  
  res.json({ success: true, data: items, pagination: { page, limit, total } });
}

const matchContext = {
  path: "targetId",
  select: "round position tournamentId teamAId teamBId",
  populate: [
    { path: "tournamentId", select: "name" },
    { path: "teamAId teamBId", select: "name tag" }
  ]
};

/**
 * =========================================================================================
 * @function getOwnReport
 * @description Quản lý CLB xem lại chi tiết nội dung báo cáo vi phạm do chính mình gửi lên.
 * @route GET /api/reports/:id
 * @access Private (ClubManager)
 * =========================================================================================
 */
export async function getOwnReport(req, res) {
  if (req.user.systemRole !== "ClubManager") throw new ApiError(403, "Only club managers can access match reports");
  const item = await ViolationReport.findOne({ _id: req.params.id, reporterId: req.user._id, targetType: "Match" }).populate(matchContext);
  if (!item) throw new ApiError(404, "Report not found");
  res.json({ success: true, data: item });
}

/**
 * =========================================================================================
 * @function reviewReport
 * @description Admin thụ lý và đưa ra kết luận xử lý cho báo cáo vi phạm.
 *              - Trạng thái cập nhật: "UnderReview" (Đang điều tra), "Resolved" (Đã giải quyết/Xử phạt), hoặc "Rejected" (Bác bỏ).
 *              - Bắt buộc có văn bản kết luận giải trình (resolution) khi chọn Resolved hoặc Rejected.
 *              - Tự động bắn thông báo (in-app & email) phản hồi kết quả tới người đã nộp đơn tố cáo.
 * @route PUT /api/admin/reports/:id
 * @access Private (Administrator)
 * =========================================================================================
 */
export async function reviewReport(req, res) {
  const item = await ViolationReport.findOne({ _id: req.params.id, targetType: "Match" });
  if (!item) throw new ApiError(404, "Report not found");
  if (["Resolved", "Rejected"].includes(item.status)) throw new ApiError(409, "Report already closed");
  if (!["UnderReview", "Resolved", "Rejected"].includes(req.body.status)) throw new ApiError(422, "Invalid report status");
  if (["Resolved", "Rejected"].includes(req.body.status)) requireText(req.body.resolution, "Resolution");
  
  Object.assign(item, pick(req.body, ["status", "resolution"]), { reviewedBy: req.user._id, reviewedAt: new Date() });
  await item.save();
  
  // Thông báo tới tài khoản người báo cáo
  await notify(item.reporterId, "REPORT_STATUS", { 
    status: item.status, 
    message: item.resolution || "Your report is under review" 
  }, `/reports/${item._id}`, { eventKey: `report:${item._id}:${item.status}` });
  
  res.json({ success: true, data: item });
}
