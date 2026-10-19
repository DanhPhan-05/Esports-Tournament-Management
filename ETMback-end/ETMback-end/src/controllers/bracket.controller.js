import mongoose from "mongoose";
import { Bracket, Match, MatchResult, Roster, TournamentApplication } from "../models/index.js";
import { requireOwnedTournament } from "../services/access.service.js";
import { buildCompetition } from "../services/competitionFormat.service.js";
import { reconcileTournament, withTournamentLock } from "../services/matchResult.service.js";
import { syncPickemEvents } from "../services/pickemEvent.service.js";
import { publicTournament } from "./public.controller.js";
import { ApiError } from "../utils/ApiError.js";
import { requireText } from "../utils/input.js";

async function approvedTeams(tournamentId, supplied) {
  const applications = await TournamentApplication.find({ tournamentId, status: "Approved" });
  const rosters = await Roster.find({ applicationId: { $in: applications.map((a) => a._id) }, status: { $in: ["Approved", "Locked"] } }).distinct("applicationId");
  const ready = new Set(rosters.map(String));
  const eligible = applications.filter((a) => ready.has(String(a._id))).map((a) => a.teamId);
  if (!supplied) return eligible;
  if (!Array.isArray(supplied) || supplied.length !== eligible.length || new Set(supplied.map(String)).size !== eligible.length || supplied.some((id) => !eligible.some((team) => String(team) === String(id)))) throw new ApiError(422, "Seeds must contain every eligible team exactly once");
  return supplied;
}
async function generate(tournament, req, bracket = null, replaceDraft = false) {
  if (["Draft", "RegistrationOpen", "Cancelled"].includes(tournament.status)) throw new ApiError(409, "Registration must be closed before generating a bracket");
  const teams = await approvedTeams(tournament._id, req.body.teamIds);
  let structure;
  try { structure = buildCompetition(tournament.tournamentType, teams, () => new mongoose.Types.ObjectId()); }
  catch (error) { throw new ApiError(422, error.message); }
  const lock = new Date(req.body.predictionLockAt || tournament.startAt);
  const open = new Date(req.body.predictionOpenAt || new Date());
  if (Number.isNaN(lock.getTime()) || Number.isNaN(open.getTime()) || open >= lock) throw new ApiError(422, "Prediction open time must precede lock time");
  bracket ||= new Bracket({ tournamentId: tournament._id, type: tournament.tournamentType, generatedBy: req.user._id });
  bracket.seeds = teams.map((teamId, i) => ({ teamId, seed: i + 1 }));
  bracket.predictionEnabled = req.body.predictionEnabled !== false;
  bracket.predictionOpenAt = open; bracket.predictionLockAt = lock;
  bracket.rounds = [...new Set(structure.map((m) => m.round))].map((round) => ({ round, matchIds: structure.filter((m) => m.round === round).map((m) => m._id) }));
  await bracket.save();
  if (replaceDraft) await Match.deleteMany({ bracketId: bracket._id });
  await Match.insertMany(structure.map((m) => ({ ...m, bracketId: bracket._id, tournamentId: tournament._id })));
  await reconcileTournament(tournament._id);
  return bracket;
}
export async function generateBracket(req, res) {
  const tournament = await requireOwnedTournament(req, req.params.tournamentId);
  const bracket = await withTournamentLock(tournament._id, async () => {
    if (await Bracket.exists({ tournamentId: tournament._id })) throw new ApiError(409, "Bracket already exists; edit the draft instead");
    return generate(tournament, req);
  });
  res.status(201).json({ success: true, data: { bracket, matches: await Match.find({ bracketId: bracket._id }).sort({ round: 1, position: 1 }) } });
}
export async function getBracket(req, res) {
  await publicTournament(req.params.tournamentId);
  const bracket = await Bracket.findOne({ tournamentId: req.params.tournamentId, status: { $ne: "Draft" } });
  if (!bracket) throw new ApiError(404, "Published bracket not found");
  res.json({ success: true, data: { bracket, matches: await Match.find({ bracketId: bracket._id }).populate("teamAId teamBId", "name tag logoUrl").sort({ round: 1, position: 1 }) } });
}
export async function getManagedBracket(req, res) {
  await requireOwnedTournament(req, req.params.tournamentId);
  const bracket = await Bracket.findOne({ tournamentId: req.params.tournamentId });
  if (!bracket) throw new ApiError(404, "Bracket not found");
  res.json({ success: true, data: { bracket, matches: await Match.find({ bracketId: bracket._id }).sort({ round: 1, position: 1 }) } });
}
export async function publishBracket(req, res) {
  const tournament = await requireOwnedTournament(req, req.params.tournamentId);
  const bracket = await Bracket.findOne({ tournamentId: tournament._id });
  if (!bracket) throw new ApiError(404, "Bracket not found");
  if (tournament.status === "Cancelled") throw new ApiError(409, "Tournament is cancelled");
  if (bracket.status !== "Draft") throw new ApiError(409, "Only a draft bracket can be published");
  bracket.status = "Published"; await bracket.save(); await syncPickemEvents(bracket);
  res.json({ success: true, data: bracket });
}
export async function updateBracket(req, res) {
  const bracket = await Bracket.findById(req.params.id);
  if (!bracket) throw new ApiError(404, "Bracket not found");
  const tournament = await requireOwnedTournament(req, bracket.tournamentId);
  requireText(req.body.reason);
  const data = await withTournamentLock(tournament._id, async () => {
    if (bracket.status !== "Draft") throw new ApiError(409, "Only unpublished drafts can be reseeded");
    const ids = await Match.find({ bracketId: bracket._id }).distinct("_id");
    if (await MatchResult.exists({ matchId: { $in: ids } })) throw new ApiError(409, "Cannot regenerate a bracket with recorded results");
    await approvedTeams(tournament._id, req.body.teamIds); // Validate before removing draft fixtures.
    if (!Array.isArray(req.body.teamIds) || req.body.teamIds.length < 2) throw new ApiError(422, "teamIds are required");
    bracket.changes.push({ reason: req.body.reason, actorId: req.user._id });
    return generate(tournament, req, bracket, true);
  });
  res.json({ success: true, data });
}
