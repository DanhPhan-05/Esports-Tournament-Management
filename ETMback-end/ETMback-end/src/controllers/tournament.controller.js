import { Bracket, Club, Game, Match, PickemEvent, Prediction, Standing, Tournament, TournamentApplication } from "../models/index.js";
import { searchText } from "../utils/input.js";
import { ApiError } from "../utils/ApiError.js";
import { pagination } from "../utils/pagination.js";

const allowedFields = ["name", "slug", "gameId", "description", "bannerUrl", "tournamentType", "maxTeams", "minRosterSize", "maxRosterSize", "registrationOpenAt", "registrationCloseAt", "rosterLockAt", "startAt", "endAt", "rules", "venue", "prizePool", "prizeCurrency", "region", "protestHours"];
const organizerFilter = (req) => req.user.systemRole === "Administrator" ? { _id: req.params.id } : { _id: req.params.id, organizerAccountId: req.user._id };

function validateTimeline(data) {
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug||''))throw new ApiError(422,"Slug must contain lowercase letters, numbers and hyphens");
  if(data.prizeCurrency&&(!['VND','USD','EUR','GBP','KRW','JPY','CNY','SGD','SAR'].includes(data.prizeCurrency)||data.prizePool!=null&&String(data.prizePool).trim()!==''&&(!Number.isFinite(Number(data.prizePool))||Number(data.prizePool)<0)))throw new ApiError(422,"Prize must be a non-negative amount with a supported currency");
  const values = [data.registrationOpenAt, data.registrationCloseAt, data.rosterLockAt, data.startAt, data.endAt].map((x) => new Date(x).getTime());
  if (values.some(Number.isNaN) || values.some((value, index) => index && value < values[index - 1])) throw new ApiError(422, "Tournament timeline is invalid");
  if (Number(data.maxRosterSize) < Number(data.minRosterSize)) throw new ApiError(422, "Maximum roster size must not be smaller than minimum roster size");
}

export async function regions(_req,res) {
 const [tournaments,clubs]=await Promise.all([Tournament.distinct('region',{status:{$ne:'Draft'}}),Club.distinct('region',{status:'Active'})]);
 const data=[...new Set([...tournaments,...clubs].filter(v=>typeof v==='string').map(v=>v.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 res.json({success:true,data});
}

export async function publicList(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const spectatorStatuses = ["Ongoing", "Completed"];
  const spectator = req.query.audience === "spectator";
  const filter = { status: spectator ? { $in: spectatorStatuses } : { $ne: "Draft" }, ...(typeof req.query.gameId === "string" ? { gameId: req.query.gameId } : {}) };
  if (spectator && req.query.status && !spectatorStatuses.includes(req.query.status)) return res.json({ success: true, data: [], pagination: { page, limit, total: 0 } });
  if (req.query.status && req.query.status !== "Draft" && typeof req.query.status === "string") filter.status = req.query.status;
  if (req.query.status === "Draft") return res.json({ success: true, data: [], pagination: { page, limit, total: 0 } });
  if (req.query.region) filter.region = String(req.query.region);
  if (req.query.search) filter.name = { $regex: searchText(req.query.search), $options: "i" };
  if (req.query.from || req.query.to) { filter.startAt = {}; for (const [key, op] of [["from", "$gte"], ["to", "$lte"]]) if (req.query[key]) { const date = new Date(req.query[key]); if (Number.isNaN(date.getTime())) throw new ApiError(422, "Invalid date filter"); filter.startAt[op] = date; } }
  const [items, total] = await Promise.all([Tournament.find(filter).populate("gameId", "name slug logoUrl").sort({ startAt: 1 }).skip(skip).limit(limit), Tournament.countDocuments(filter)]);
  res.json({ success: true, data: items, pagination: { page, limit, total } });
}

export async function publicGet(req, res) {
  const item = await Tournament.findOne({ _id: req.params.id, status: { $ne: "Draft" } }).populate("gameId", "name slug logoUrl");
  if (!item) throw new ApiError(404, "Tournament not found");
  const [bracket, schedule, standings] = await Promise.all([Bracket.findOne({ tournamentId: item._id, status: { $ne: "Draft" } }), Match.find({ tournamentId: item._id }).select("round position teamAId teamBId scheduledAt venue status"), Standing.find({ tournamentId: item._id }).sort({ rank: 1 })]);
  const participants=await TournamentApplication.find({tournamentId:item._id,status:"Approved"}).populate("teamId","name tag logoUrl clubId gameId").select("teamId");
  res.json({ success: true, data: { ...item.toObject(), bracket, schedule: bracket ? schedule : [], standings, teams:participants.map(p=>p.teamId).filter(Boolean) } });
}
export async function managedGet(req, res) { const item = await Tournament.findOne(organizerFilter(req)); if (!item) throw new ApiError(404, "Tournament not found"); res.json({ success: true, data: item }); }

export async function organizerList(req, res) {
  const filter = req.user.systemRole === "Administrator" ? {} : { organizerAccountId: req.user._id };
  res.json({ success: true, data: await Tournament.find(filter).populate("gameId").sort({ createdAt: -1 }) });
}

export async function createTournament(req, res) {
  if (!(await Game.exists({ _id: req.body.gameId, isActive: true }))) throw new ApiError(422, "Active game is required");
  if (req.body.tournamentType === "Swiss") throw new ApiError(422, "Swiss is not supported by the current competition generator");
  validateTimeline(req.body);
  const data = Object.fromEntries(allowedFields.filter((key) => key in req.body).map((key) => [key, req.body[key]]));
  const item = await Tournament.create({ ...data, organizerAccountId: req.user._id });
  res.status(201).json({ success: true, data: item });
}

export async function updateTournament(req, res) {
  const item = await Tournament.findOne(organizerFilter(req)); if (!item) throw new ApiError(404, "Tournament not found");
  if (!["Draft", "RegistrationOpen"].includes(item.status)) throw new ApiError(409, "Tournament can no longer be edited");
  for (const key of allowedFields) if (key in req.body) item[key] = req.body[key];
  if (item.tournamentType === "Swiss") throw new ApiError(422, "Swiss format is not supported");
  validateTimeline(item); await item.save();
  res.json({ success: true, data: item });
}

export async function changeStatus(req, res) {
  const item = await Tournament.findOne(organizerFilter(req)); if (!item) throw new ApiError(404, "Tournament not found");
  const transitions = { Draft: ["RegistrationOpen", "Cancelled"], RegistrationOpen: ["RegistrationClosed", "Cancelled"], RegistrationClosed: ["Ongoing", "Cancelled"], Ongoing: ["Completed", "Postponed", "Cancelled"], Postponed: ["Ongoing", "Cancelled"] };
  if (!(transitions[item.status] || []).includes(req.body.status)) throw new ApiError(409, `Cannot change ${item.status} to ${req.body.status}`);
  if (["Postponed", "Cancelled"].includes(req.body.status)) { if (!String(req.body.reason || "").trim()) throw new ApiError(422, "A reason is required"); item[req.body.status === "Postponed" ? "postponeReason" : "cancelReason"] = req.body.reason; }
  item.status = req.body.status; await item.save();
  if (item.status === "Cancelled") {
    await Bracket.updateMany({ tournamentId: item._id }, { predictionEnabled: false });
    await Match.updateMany({ tournamentId: item._id, status: { $ne: "Completed" } }, { status: "Cancelled" });
    await PickemEvent.updateMany({ tournamentId: item._id }, { status: "Cancelled" });
    await Prediction.updateMany({ tournamentId: item._id, status: { $in: ["Active", "Locked"] } }, { status: "Cancelled" });
  }
  res.json({ success: true, data: item });
}
