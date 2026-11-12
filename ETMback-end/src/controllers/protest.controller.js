import { Club, Match, MatchResult, Protest, Team, Tournament } from "../models/index.js";
import { requireOwnedTournament } from "../services/access.service.js";
import { writeResult } from "../services/matchResult.service.js";
import { notify } from "../services/notification.service.js";
import { ApiError } from "../utils/ApiError.js";
import { evidence, pick, requireText } from "../utils/input.js";
import { pagination } from "../utils/pagination.js";

async function accessible(req, organizerOnly = false) {
  const item = await Protest.findById(req.params.id);
  if (!item) throw new ApiError(404, "Protest not found");
  if (req.user.systemRole === "ClubManager" && !organizerOnly) {
    if (!await Club.exists({ _id: item.clubId, managerAccountIds: req.user._id })) throw new ApiError(403, "Protest belongs to another club");
  } else await requireOwnedTournament(req, item.tournamentId);
  return item;
}
export function protestDeadline(confirmedAt, hours = 72) { return new Date(new Date(confirmedAt).getTime() + hours * 3600000); }
export function assertPendingProtest(item) {
  if (!["Submitted", "NeedMoreInfo"].includes(item.status) || item.resolvingUntil && item.resolvingUntil > new Date()) throw new ApiError(409, "Protest already closed or being resolved");
}
export async function createProtest(req, res) {
  const match = await Match.findById(req.body.matchId);
  if (!match) throw new ApiError(404, "Match not found");
  const result = await MatchResult.findOne({ matchId: match._id, status: "Confirmed" });
  if (!result?.confirmedAt) throw new ApiError(409, "Only official match results can be protested");
  const tournament = await Tournament.findById(match.tournamentId);
  const deadline = protestDeadline(result.confirmedAt, tournament.protestHours);
  if (new Date() >= deadline) throw new ApiError(409, "Protest deadline has passed");
  const teams = await Team.find({ _id: { $in: [match.teamAId, match.teamBId] } }).distinct("clubId");
  const club = await Club.findOne({ _id: { $in: teams }, managerAccountIds: req.user._id, ...(req.body.clubId ? { _id: req.body.clubId } : {}) });
  if (!club || !teams.some((id) => String(id) === String(club._id))) throw new ApiError(403, "Only a participating club may protest");
  if (await Protest.exists({ clubId: club._id, matchId: match._id, status: { $in: ["Submitted", "NeedMoreInfo"] } })) throw new ApiError(409, "An open protest already exists");
  const item = await Protest.create({ ...pick(req.body, ["category", "description"]), evidenceUrls: evidence(req.body.evidenceUrls), clubId: club._id, tournamentId: match.tournamentId, matchId: match._id, submittedBy: req.user._id, deadline, timeline: [{ action: "Submitted", actorId: req.user._id }] });
  await notify(tournament.organizerAccountId, "PROTEST_SUBMITTED", { message: `A protest was submitted for match ${match._id}` }, `/protests/${item._id}`, { eventKey: `protest:${item._id}:submitted` });
  res.status(201).json({ success: true, data: item });
}
export async function eligibleMatches(req,res){
 const clubIds=await Club.find({managerAccountIds:req.user._id,...(req.query.clubId?{_id:req.query.clubId}:{})}).distinct("_id");
 const teamIds=await Team.find({clubId:{$in:clubIds}}).distinct("_id");
 const matches=await Match.find({$or:[{teamAId:{$in:teamIds}},{teamBId:{$in:teamIds}}]}).populate("teamAId teamBId","name tag clubId").populate("tournamentId","name protestHours");
 const results=await MatchResult.find({matchId:{$in:matches.map(m=>m._id)},status:"Confirmed"});
 const data=matches.flatMap(match=>{const result=results.find(r=>String(r.matchId)===String(match._id));if(!result?.confirmedAt||!match.tournamentId)return [];const deadline=protestDeadline(result.confirmedAt,match.tournamentId.protestHours);return new Date()<deadline?[{match,result:{teamAScore:result.teamAScore,teamBScore:result.teamBScore,confirmedAt:result.confirmedAt},deadline}]:[];});
 res.json({success:true,data});
}
export async function listProtests(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = pick(req.query, ["status", "tournamentId"]);
  if (req.user.systemRole === "ClubManager") filter.clubId = { $in: await Club.find({ managerAccountIds: req.user._id }).distinct("_id") };
  else if (req.user.systemRole === "TournamentOrganizer") filter.tournamentId = { $in: await Tournament.find({ organizerAccountId: req.user._id, ...(req.query.tournamentId ? { _id: req.query.tournamentId } : {}) }).distinct("_id") };
  const [items, total] = await Promise.all([Protest.find(filter).populate("clubId tournamentId","name").populate({path:"matchId",select:"teamAId teamBId round position",populate:{path:"teamAId teamBId",select:"name tag"}}).sort({ createdAt: -1 }).skip(skip).limit(limit), Protest.countDocuments(filter)]);
  res.json({ success: true, data: items, pagination: { page, limit, total } });
}
export async function getProtest(req, res) { const item=await accessible(req);await item.populate([{path:"clubId tournamentId",select:"name"},{path:"matchId",select:"teamAId teamBId round position bestOf",populate:{path:"teamAId teamBId",select:"name tag"}},{path:"timeline.actorId",select:"fullName"}]);res.json({ success: true, data:item }); }
export async function updateProtest(req, res) {
  const item = await accessible(req); assertPendingProtest(item);
  Object.assign(item, pick(req.body, ["description"]));
  if (req.body.evidenceUrls) item.evidenceUrls = evidence(req.body.evidenceUrls);
  item.timeline.push({ action: "Supplemented", actorId: req.user._id }); item.status = "Submitted";
  await item.save(); res.json({ success: true, data: item });
}
export async function withdrawProtest(req, res) {
  const item = await accessible(req); assertPendingProtest(item); item.status = "Withdrawn";
  item.timeline.push({ action: "Withdrawn", actorId: req.user._id });
  await item.save(); res.json({ success: true, data: item });
}
export async function requestEvidence(req, res) {
  const item = await accessible(req, true); assertPendingProtest(item);
  item.status = "NeedMoreInfo"; item.timeline.push({ action: "NeedMoreInfo", note: requireText(req.body.explanation, "Explanation"), actorId: req.user._id });
  await item.save();
  await notify(item.submittedBy, "PROTEST_EVIDENCE", { message: req.body.explanation }, `/protests/${item._id}`, { eventKey: `protest:${item._id}:evidence:${item.timeline.length}` });
  res.json({ success: true, data: item });
}
export async function resolveProtest(req, res) {
  const item = await accessible(req, true);
  if (item.status === "Resolved") {
    if (req.body.decision !== item.decision) throw new ApiError(409, "Protest already has a different decision");
    return res.json({ success: true, data: item });
  }
  assertPendingProtest(item);
  if (!["Accepted", "Rejected"].includes(req.body.decision)) throw new ApiError(422, "Decision must be Accepted or Rejected");
  const explanation = requireText(req.body.explanation, "Explanation");
  // Claim the decision so concurrent reviewers cannot apply the correction twice.
  const now = new Date();
  const claim = await Protest.findOneAndUpdate({ _id: item._id, status: { $in: ["Submitted", "NeedMoreInfo"] }, $or: [{ resolvingUntil: null }, { resolvingUntil: { $lte: now } }] }, { resolvingUntil: new Date(now.getTime() + 120000), reviewedBy: req.user._id }, { new: true });
  if (!claim) throw new ApiError(409, "Protest is being resolved");
  try {
    if (req.body.decision === "Accepted" && req.body.result) {
      const match = await Match.findById(item.matchId);
      await writeResult(req, match, { ...req.body.result, correctionReason: `Protest ${item._id}: ${explanation}` }, { confirm: true });
    }
    claim.status = "Resolved"; claim.decision = req.body.decision; claim.explanation = explanation; claim.resolvedAt = new Date(); claim.resolvingUntil = undefined;
    claim.timeline.push({ action: claim.decision, note: explanation, actorId: req.user._id });
    await claim.save();
  } catch (error) { await Protest.updateOne({ _id: item._id, status: { $ne: "Resolved" } }, { $unset: { resolvingUntil: 1, reviewedBy: 1 } }); throw error; }
  const tournament = await Tournament.findById(item.tournamentId);
  for (const accountId of new Set([String(item.submittedBy), String(tournament.organizerAccountId)])) await notify(accountId, "PROTEST_RESOLVED", { message: explanation, decision: claim.decision }, `/protests/${item._id}`, { eventKey: `protest:${item._id}:resolved` });
  res.json({ success: true, data: claim });
}
