import { Bracket, Club, ClubMember, Content, Game, Match, MatchResult, Standing, Team, Tournament } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { pagination } from "../utils/pagination.js";
import { pick, searchText } from "../utils/input.js";

export async function publicTournament(id) {
  const item = await Tournament.findOne({ _id: id, status: { $ne: "Draft" } });
  if (!item) throw new ApiError(404, "Tournament not found");
  return item;
}
export async function clubs(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = { status: "Active" };
  if (req.query.search) filter.name = { $regex: searchText(req.query.search), $options: "i" };
  const [data, total] = await Promise.all([Club.find(filter).select("name shortName logoUrl description country region").skip(skip).limit(limit), Club.countDocuments(filter)]);
  res.json({ success: true, data, pagination: { page, limit, total } });
}
export async function club(req, res) {
  const item = await Club.findOne({ _id: req.params.clubId, status: "Active" }).select("name shortName logoUrl description country region");
  if (!item) throw new ApiError(404, "Club not found");
  const teams = await Team.find({ clubId: item._id }).select("name tag logoUrl gameId status").populate("gameId", "name slug");
  const ids = teams.map((team) => team._id);
  const published=await Bracket.find({status:{$ne:"Draft"}}).distinct("_id");
  const [members, standings, history] = await Promise.all([
    ClubMember.find({ clubId: item._id, status: "Active", activeFrom: { $lte: new Date() }, $or: [{ activeUntil: null }, { activeUntil: { $gt: new Date() } }] }).select("inGameName teamId teamRole"),
    Standing.find({ teamId: { $in: ids } }).populate({ path: "tournamentId", match: { status: { $ne: "Draft" } }, select: "name status" }),
    Match.find({ bracketId:{$in:published}, $or: [{ teamAId: { $in: ids } }, { teamBId: { $in: ids } }] }).populate("teamAId teamBId","name tag logoUrl").populate({ path: "tournamentId", match: { status: { $ne: "Draft" } }, select: "name" }).sort({ scheduledAt: -1 }).limit(50),
  ]);
  res.json({ success: true, data: { ...item.toObject(), teams, members, standings: standings.filter((s) => s.tournamentId), matches: history.filter((m) => m.tournamentId) } });
}
export async function games(_req, res) { res.json({ success: true, data: await Game.find({ isActive: true }).sort({ name: 1 }) }); }
export async function news(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = { status: "Published", publishedAt: { $lte: new Date() }, ...pick(req.query, ["type"]) };
  if(req.query.search)filter.title={$regex:searchText(req.query.search),$options:"i"};
  const [data, total] = await Promise.all([Content.find(filter).select("title slug summary type imageUrl publishedAt").sort({ publishedAt: -1 }).skip(skip).limit(limit), Content.countDocuments(filter)]);
  res.json({ success: true, data, pagination: { page, limit, total } });
}
export async function article(req, res) {
  const item = await Content.findOne({ slug: req.params.slug, status: "Published", publishedAt: { $lte: new Date() } }).select("title slug summary body type imageUrl videoUrl publishedAt");
  if (!item) throw new ApiError(404, "Article not found");
  res.json({ success: true, data: item });
}
export async function standings(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const tournaments = await Tournament.find({ status: { $ne: "Draft" }, ...pick(req.query, ["gameId"]), ...(req.query.tournamentId ? { _id: req.query.tournamentId } : {}) }).distinct("_id");
  const filter = { tournamentId: { $in: tournaments } };
  const [data, total] = await Promise.all([Standing.find(filter).populate("teamId", "name tag logoUrl").populate("tournamentId", "name gameId").sort({ points: -1, wins: -1, scoreFor: -1 }).skip(skip).limit(limit), Standing.countDocuments(filter)]);
  res.json({ success: true, data, pagination: { page, limit, total } });
}
export async function matches(req, res) {
  await publicTournament(req.params.tournamentId);
  if(!await Bracket.exists({tournamentId:req.params.tournamentId,status:{$ne:"Draft"}}))return res.json({success:true,data:[]});
  const items = await Match.find({ tournamentId: req.params.tournamentId }).populate("teamAId teamBId", "name tag logoUrl").sort({ round: 1, position: 1 });
  const results = await MatchResult.find({ matchId: { $in: items.map((m) => m._id) }, status: "Confirmed" }).select("matchId teamAScore teamBScore winnerTeamId games statistics status confirmedAt isForfeit");
  const byId = new Map(results.map((r) => [String(r.matchId), r]));
  res.json({ success: true, data: items.map((m) => ({ ...m.toObject(), result: byId.get(String(m._id)) || null })) });
}
export async function matchDetail(req,res){
 const match=await Match.findById(req.params.id).populate("teamAId teamBId","name tag logoUrl clubId");
 if(!match)throw new ApiError(404,"Match not found");
 const tournament=await publicTournament(match.tournamentId);
 if(!await Bracket.exists({_id:match.bracketId,status:{$ne:"Draft"}}))throw new ApiError(404,"Published match not found");
 const result=await MatchResult.findOne({matchId:match._id,status:"Confirmed"}).select("teamAScore teamBScore winnerTeamId games statistics confirmedAt isForfeit");
 res.json({success:true,data:{match:{_id:match._id,teamAId:match.teamAId,teamBId:match.teamBId,round:match.round,position:match.position,bestOf:match.bestOf,scheduledAt:match.scheduledAt,status:match.status,venue:match.venue,streamUrl:match.streamUrl,tournamentId:match.tournamentId},tournament:{_id:tournament._id,name:tournament.name},result}});
}
