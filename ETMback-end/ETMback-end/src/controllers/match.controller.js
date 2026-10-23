import { AuditRecord, Bracket, Match, MatchResult } from "../models/index.js";
import { requireOwnedTournament } from "../services/access.service.js";
import { writeResult } from "../services/matchResult.service.js";
import { syncPickemEvents } from "../services/pickemEvent.service.js";
import { ApiError } from "../utils/ApiError.js";
import { pick, requireText } from "../utils/input.js";

async function ownedMatch(req) {
  const match = await Match.findById(req.params.id);
  if (!match) throw new ApiError(404, "Match not found");
  await requireOwnedTournament(req, match.tournamentId); return match;
}
export async function getMatchDetail(req, res) {
  const match = await ownedMatch(req);
  await match.populate("teamAId teamBId", "name tag logoUrl");
  const [result, audit] = await Promise.all([
    MatchResult.findOne({ matchId: match._id }),
    AuditRecord.find({ matchId: match._id }).populate("actorId", "fullName").sort({ createdAt: -1 }).limit(200),
  ]);
  res.json({ success: true, data: { match, result, audit } });
}
export async function scheduleMatch(req, res) {
  const match = await ownedMatch(req);
  if (["Completed", "Cancelled"].includes(match.status)) throw new ApiError(409, "Match cannot be rescheduled");
  const scheduledAt = new Date(req.body.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new ApiError(422, "Valid scheduledAt is required");
  if (req.body.bestOf !== undefined && (!Number.isInteger(req.body.bestOf) || req.body.bestOf < 1 || req.body.bestOf > 9 || req.body.bestOf % 2 === 0)) throw new ApiError(422, "bestOf must be an odd integer from 1 to 9");
  Object.assign(match, pick(req.body, ["venue", "bestOf", "referee", "streamUrl"]), { scheduledAt, status: "Scheduled" });
  await match.save();
  await syncPickemEvents(await Bracket.findById(match.bracketId));
  res.json({ success: true, data: match });
}
export async function createResult(req, res) { res.status(201).json({ success: true, data: await writeResult(req, await ownedMatch(req), req.body, { createOnly: true }) }); }
export async function updateResult(req, res) { res.json({ success: true, data: await writeResult(req, await ownedMatch(req), req.body) }); }
export async function recordResult(req, res) { res.json({ success: true, data: await writeResult(req, await ownedMatch(req), req.body, { confirm: true }) }); }
export async function confirmResult(req, res) {
  const match = await ownedMatch(req);
  if (!await MatchResult.exists({ matchId: match._id })) throw new ApiError(404, "Create a result before confirmation");
  res.json({ success: true, data: await writeResult(req, match, {}, { confirm: true }) });
}
export async function getResult(req, res) {
  const match = await ownedMatch(req), result = await MatchResult.findOne({ matchId: match._id });
  if (!result) throw new ApiError(404, "Result not found");
  res.json({ success: true, data: result });
}
export async function forfeitMatch(req, res) {
  const match = await ownedMatch(req);
  const reason = requireText(req.body.reason);
  if (![String(match.teamAId), String(match.teamBId)].includes(String(req.body.losingTeamId))) throw new ApiError(422, "Losing team must be a participant");
  const wins = Math.floor(match.bestOf / 2) + 1;
  const aLoses = String(match.teamAId) === String(req.body.losingTeamId);
  res.json({ success: true, data: await writeResult(req, match, { teamAScore: aLoses ? 0 : wins, teamBScore: aLoses ? wins : 0, isForfeit: true, correctionReason: reason }, { confirm: true }) });
}
export async function postponeMatch(req, res) {
  const match = await ownedMatch(req);
  if (["Completed", "Cancelled"].includes(match.status)) throw new ApiError(409, "Match cannot be postponed");
  match.postponeReason = requireText(req.body.reason); match.status = "Postponed";
  await match.save(); res.json({ success: true, data: match });
}
