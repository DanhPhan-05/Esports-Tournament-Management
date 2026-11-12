import { ViolationReport, Match, Team, Club, Bracket, Tournament } from "../models/index.js";
import { REPORT_CATEGORIES } from "../models/ViolationReport.js";
import { ApiError } from "../utils/ApiError.js";
import { evidence, objectId, pick, requireText } from "../utils/input.js";
import { pagination } from "../utils/pagination.js";
import { notify } from "../services/notification.service.js";

export async function createReport(req, res) {
  if(req.user.systemRole!=="ClubManager")throw new ApiError(403,"Only club managers can report a match");
  if(req.body.targetType!=="Match")throw new ApiError(422,"Reports must refer to a specific match");
  if(!REPORT_CATEGORIES.includes(req.body.category))throw new ApiError(422,"Select a match result or rule violation category");
  objectId(req.body.targetId);
  const match=await Match.findById(req.body.targetId);
  if(!match)throw new ApiError(404,"Match not found");
  const tournament=await Tournament.findOne({_id:match.tournamentId,status:{$nin:["Draft","Cancelled"]}});
  if(!tournament||!await Bracket.exists({_id:match.bracketId,status:"Published"})||match.enabled===false||match.isBye||match.status==="Cancelled")throw new ApiError(409,"Match is not available for reporting");
  const clubIds=await Team.find({_id:{$in:[match.teamAId,match.teamBId].filter(Boolean)}}).distinct("clubId");
  if(!await Club.exists({_id:{$in:clubIds},managerAccountIds:req.user._id}))throw new ApiError(403,"Only a manager of a participating club can report this match");
  const report = await ViolationReport.create({targetType:"Match",targetId:match._id,category:req.body.category,description:requireText(req.body.description,"Description"), evidenceUrls: evidence(req.body.evidenceUrls), reporterId: req.user._id });
  res.status(201).json({ success: true, data: report });
}
export async function listReports(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = {...pick(req.query, ["status", "category"]),targetType:"Match"};
  const [items, total] = await Promise.all([ViolationReport.find(filter).populate("reporterId", "fullName email").populate(matchContext).sort({ createdAt: -1 }).skip(skip).limit(limit), ViolationReport.countDocuments(filter)]);
  res.json({ success: true, data: items, pagination: { page, limit, total } });
}
const matchContext={path:"targetId",select:"round position tournamentId teamAId teamBId",populate:[{path:"tournamentId",select:"name"},{path:"teamAId teamBId",select:"name tag"}]};
export async function getOwnReport(req,res){if(req.user.systemRole!=="ClubManager")throw new ApiError(403,"Only club managers can access match reports");const item=await ViolationReport.findOne({_id:req.params.id,reporterId:req.user._id,targetType:"Match"}).populate(matchContext);if(!item)throw new ApiError(404,"Report not found");res.json({success:true,data:item});}
export async function reviewReport(req, res) {
  const item = await ViolationReport.findOne({_id:req.params.id,targetType:"Match"});
  if (!item) throw new ApiError(404, "Report not found");
  if (["Resolved", "Rejected"].includes(item.status)) throw new ApiError(409, "Report already closed");
  if (!["UnderReview", "Resolved", "Rejected"].includes(req.body.status)) throw new ApiError(422, "Invalid report status");
  if (["Resolved", "Rejected"].includes(req.body.status)) requireText(req.body.resolution, "Resolution");
  Object.assign(item, pick(req.body, ["status", "resolution"]), { reviewedBy: req.user._id, reviewedAt: new Date() });
  await item.save();
  await notify(item.reporterId, "REPORT_STATUS", { status: item.status, message: item.resolution || "Your report is under review" }, `/reports/${item._id}`, { eventKey: `report:${item._id}:${item.status}` });
  res.json({ success: true, data: item });
}
