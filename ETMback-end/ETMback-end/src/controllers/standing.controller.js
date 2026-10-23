import { Match, MatchResult, Standing, TournamentApplication } from "../models/index.js";
import { requireOwnedTournament } from "../services/access.service.js";
import { publicTournament } from "./public.controller.js";

export async function standings(req, res) {
  await publicTournament(req.params.tournamentId);
  const items = await Standing.find({ tournamentId: req.params.tournamentId }).populate("teamId").sort({ points: -1, wins: -1, scoreFor: -1 });
  res.json({ success: true, data: items.map((item, index) => ({ ...item.toObject(), rank: index + 1 })) });
}

export async function tournamentReport(req, res) {
  await requireOwnedTournament(req, req.params.tournamentId);
  const matchIds = await Match.find({ tournamentId: req.params.tournamentId }).distinct("_id");
  const [applications, matches, completedMatches, table] = await Promise.all([
    TournamentApplication.countDocuments({ tournamentId: req.params.tournamentId }),
    Match.countDocuments({ tournamentId: req.params.tournamentId }),
    MatchResult.countDocuments({ matchId: { $in: matchIds } }),
    Standing.find({ tournamentId: req.params.tournamentId }).sort({ points: -1 }),
  ]);
  const [participants, schedule, results] = await Promise.all([TournamentApplication.find({ tournamentId: req.params.tournamentId, status: "Approved" }).populate("teamId"), Match.find({ tournamentId: req.params.tournamentId }).populate("teamAId teamBId"), MatchResult.find({ matchId: { $in: matchIds }, status: "Confirmed" })]);
  if (req.query.format === "csv") {
    const quote = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = [["teamId", "played", "wins", "losses", "points", "scoreFor", "scoreAgainst"], ...table.map((r) => [r.teamId, r.played, r.wins, r.losses, r.points, r.scoreFor, r.scoreAgainst])];
    return res.type("text/csv").attachment("standings.csv").send(rows.map((r) => r.map(quote).join(",")).join("\r\n"));
  }
  res.json({ success: true, data: { applications, matches, completedMatches, participants, schedule, results, standings: table } });
}
