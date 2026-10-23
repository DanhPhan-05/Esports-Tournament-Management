import { randomUUID } from "node:crypto";
import { Bracket, Club, Match, MatchResult, Standing, Team, Tournament, TournamentApplication } from "../models/index.js";
import { recordMatchResultAudit } from "./audit.service.js";
import { evaluateCompetition } from "./competitionFormat.service.js";
import { scorePredictions } from "./prediction.service.js";
import { syncPickemEvents } from "./pickemEvent.service.js";
import { notify } from "./notification.service.js";
import { ApiError } from "../utils/ApiError.js";
import { evidence, requireText } from "../utils/input.js";

export function validateScore(match, data, complete = true) {
  const a = data.teamAScore, b = data.teamBScore;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a === b) throw new ApiError(422, "Scores must be non-negative unequal integers");
  const needed = Math.floor(match.bestOf / 2) + 1;
  if (a > needed || b > needed || (complete && Math.max(a, b) !== needed)) throw new ApiError(422, `A best-of-${match.bestOf} result requires a winner with ${needed} wins`);
  return a > b ? match.teamAId : match.teamBId;
}
export async function withTournamentLock(id, callback) {
  const token = randomUUID(), now = new Date();
  const locked = await Tournament.findOneAndUpdate({ _id: id, $or: [{ processingUntil: null }, { processingUntil: { $lte: now } }] }, { processingToken: token, processingUntil: new Date(now.getTime() + 120000) });
  if (!locked) throw new ApiError(409, "Tournament is being updated; retry shortly");
  try { return await callback(); }
  finally { await Tournament.updateOne({ _id: id, processingToken: token }, { $unset: { processingToken: 1, processingUntil: 1 } }); }
}
export function descendants(matches, id) {
  const map = new Map(matches.map((m) => [String(m._id), m]));
  const seen = new Set(), queue = [String(id)];
  while (queue.length) {
    const m = map.get(queue.shift());
    for (const next of [m?.nextMatchId, m?.loserNextMatchId]) if (next && !seen.has(String(next))) { seen.add(String(next)); queue.push(String(next)); }
    if (m?.section === "Final") { const reset = matches.find((v) => v.section === "Reset"); if (reset) seen.add(String(reset._id)); }
  }
  return [...seen];
}
export function calculateStandings(matches, results, teamIds) {
  const table = new Map(teamIds.map((id) => [String(id), { teamId: id, played: 0, wins: 0, losses: 0, draws: 0, points: 0, scoreFor: 0, scoreAgainst: 0 }]));
  const byMatch = new Map(matches.map((m) => [String(m._id), m]));
  for (const result of results.filter((r) => r.status === "Confirmed")) {
    const match = byMatch.get(String(result.matchId)); if (!match?.teamAId || !match.teamBId || match.isBye) continue;
    for (const [id, scoreFor, scoreAgainst] of [[match.teamAId, result.teamAScore, result.teamBScore], [match.teamBId, result.teamBScore, result.teamAScore]]) {
      const row = table.get(String(id)); if (!row) continue;
      const won = String(id) === String(result.winnerTeamId);
      row.played++; row.wins += Number(won); row.losses += Number(!won); row.points += won ? 3 : 0; row.scoreFor += scoreFor; row.scoreAgainst += scoreAgainst;
    }
  }
  return [...table.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || (b.scoreFor - b.scoreAgainst) - (a.scoreFor - a.scoreAgainst) || String(a.teamId).localeCompare(String(b.teamId))).map((row, i) => ({ ...row, rank: i + 1 }));
}
export async function reconcileTournament(tournamentId) {
  const bracket = await Bracket.findOne({ tournamentId }); if (!bracket) return;
  const matches = await Match.find({ bracketId: bracket._id }).lean();
  const results = (await MatchResult.find({ matchId: { $in: matches.map((m) => m._id) }, $or: [{ status: "Confirmed" }, { status: { $exists: false } }] }).lean()).map((result) => ({ ...result, status: "Confirmed" }));
  const states = evaluateCompetition(matches, results);
  for (const m of states) await Match.updateOne({ _id: m._id }, { teamAId: m.teamAId, teamBId: m.teamBId, isBye: m.isBye, enabled: m.enabled !== false, ...(m.isBye ? { status: "Completed" } : {}) });
  const teams = await TournamentApplication.find({ tournamentId, status: "Approved" }).distinct("teamId");
  const table = calculateStandings(states, results, teams);
  if (table.length) await Standing.bulkWrite(table.map((row) => ({ updateOne: { filter: { tournamentId, teamId: row.teamId }, update: { $set: row }, upsert: true } })));
  for (const result of results) { const match = states.find((m) => String(m._id) === String(result.matchId)); if (match) await scorePredictions(match, result); }
  await syncPickemEvents(bracket);
}
export async function writeResult(req, match, data, { confirm = false, createOnly = false } = {}) {
  return withTournamentLock(match.tournamentId, async () => {
    match = await Match.findById(match._id);
    if (!match.teamAId || !match.teamBId || match.isBye || match.enabled === false) throw new ApiError(409, "Match participants are not ready");
    const tournament = await Tournament.findById(match.tournamentId);
    if (["Cancelled", "Draft"].includes(tournament.status)) throw new ApiError(409, "Tournament does not accept results");
    let existing = await MatchResult.findOne({ matchId: match._id });
    if (createOnly && existing) throw new ApiError(409, "Result already exists");
    if (confirm && existing?.status === "Confirmed" && data.teamAScore === undefined) { await reconcileTournament(match.tournamentId); return existing; }
    const scores = data.teamAScore === undefined && existing ? existing.toObject() : data;
    const final = confirm || existing?.status === "Confirmed";
    const winnerTeamId = validateScore(match, scores, final);
    const previous = existing?.toObject();
    if (existing?.status === "Confirmed") {
      requireText(data.correctionReason, "Correction reason");
      const matches = await Match.find({ bracketId: match.bracketId }).lean();
      const later = descendants(matches, match._id);
      if (String(winnerTeamId) !== String(existing.winnerTeamId) && await MatchResult.exists({ matchId: { $in: later }, status: "Confirmed" })) throw new ApiError(409, "A downstream result is confirmed; reverse it before changing this winner");
      if (String(winnerTeamId) !== String(existing.winnerTeamId)) await MatchResult.deleteMany({ matchId: { $in: later }, status: "Draft" });
    }
    existing ||= new MatchResult({ matchId: match._id, revision: 0 });
    Object.assign(existing, { teamAScore: scores.teamAScore, teamBScore: scores.teamBScore, winnerTeamId, recordedBy: req.user._id,
      isForfeit: Boolean(data.isForfeit ?? existing.isForfeit), evidenceUrls: evidence(data.evidenceUrls || existing.evidenceUrls),
      games: data.games || existing.games, statistics: data.statistics || existing.statistics,
      correctionReason: data.correctionReason, status: final ? "Confirmed" : "Draft", revision: existing.revision + 1,
      ...(final ? { confirmedBy: req.user._id, confirmedAt: new Date() } : {}),
    });
    await existing.save();
    await recordMatchResultAudit(req, match, existing, previous);
    if (final) {
      match.status = "Completed"; await match.save();
      await reconcileTournament(match.tournamentId);
      const clubIds = await Team.find({ _id: { $in: [match.teamAId, match.teamBId] } }).distinct("clubId");
      const clubs = await Club.find({ _id: { $in: clubIds } });
      for (const club of clubs) for (const account of club.managerAccountIds) await notify(account, "MATCH_RESULT", { message: `Match result: ${existing.teamAScore}-${existing.teamBScore}` }, `/matches/${match._id}`, { eventKey: `result:${existing._id}:${existing.revision}` });
    }
    return existing;
  });
}
