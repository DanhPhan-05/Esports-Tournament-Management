import { Ban, ClubMember, Roster, Tournament } from "../models/index.js";
import { requireManagedTeam } from "../services/access.service.js";
import { ApiError } from "../utils/ApiError.js";
import { validateRoster } from "../services/roster.service.js";
import { requireOwnedTournament } from "../services/access.service.js";
import { requireText } from "../utils/input.js";
import { TournamentApplication } from "../models/index.js";

export async function getRoster(req, res) {
  const roster = await Roster.findById(req.params.id).populate("entries.clubMemberId", "fullName inGameName teamRole citizenIdLast4 activeFrom activeUntil status teamId gameId");
  if (!roster) throw new ApiError(404, "Roster not found");
  if (req.user.systemRole === "ClubManager") await requireManagedTeam(req, roster.teamId);
  else {
    const tournament = await Tournament.findById(roster.tournamentId);
    if (req.user.systemRole !== "Administrator" && String(tournament.organizerAccountId) !== String(req.user._id)) throw new ApiError(403, "Forbidden");
  }
  res.json({ success: true, data: roster });
}

export async function updateRoster(req, res) {
  const roster = await Roster.findById(req.params.id);
  if (!roster) throw new ApiError(404, "Roster not found");
  const team = await requireManagedTeam(req, roster.teamId);
  const tournament = await Tournament.findById(roster.tournamentId);
  if (new Date() >= tournament.rosterLockAt || ["Approved", "Locked"].includes(roster.status)) throw new ApiError(409, "Roster is locked; submit a change request instead");
  roster.entries = await validateRoster(roster, req.body.entries, { enforceSize: false });
  await roster.save();
  res.json({ success: true, data: roster });
}

export async function listRosters(req, res) {
  const tournamentId = req.params.tournamentId || req.query.tournamentId;
  if (tournamentId) await requireOwnedTournament(req, tournamentId);
  else if (!req.query.applicationId) throw new ApiError(422, "tournamentId or applicationId is required");
  const filter = { ...(tournamentId ? { tournamentId } : {}), ...(req.query.applicationId ? { applicationId: req.query.applicationId } : {}) };
  const items = await Roster.find(filter);
  if (!tournamentId && items.length) {
    if (req.user.systemRole === "ClubManager") await requireManagedTeam(req, items[0].teamId);
    else await requireOwnedTournament(req, items[0].tournamentId);
  }
  res.json({ success: true, data: items });
}
export async function createRoster(req, res) {
  const application = await TournamentApplication.findById(req.body.applicationId);
  if (!application) throw new ApiError(404, "Application not found");
  await requireManagedTeam(req, application.teamId);
  let roster = await Roster.findOne({ applicationId: application._id });
  if (!roster) { roster = await Roster.create({ applicationId: application._id, tournamentId: application.tournamentId, teamId: application.teamId }); res.status(201); }
  req.params.id = roster._id;
  return updateRoster(req, res);
}
export async function reviewRoster(req, res) {
  const roster = await Roster.findById(req.params.id);
  if (!roster) throw new ApiError(404, "Roster not found");
  await requireOwnedTournament(req, roster.tournamentId);
  const application = await TournamentApplication.findById(roster.applicationId);
  if (!application || !["Submitted", "UnderReview", "Approved"].includes(application.status)) throw new ApiError(409, "Application is not eligible for roster review");
  const status = req.body.status;
  if (!["Approved", "Rejected"].includes(status)) throw new ApiError(422, "Invalid roster review status");
  if (roster.status === status) return res.json({ success: true, data: roster });
  if (roster.status !== "Submitted") throw new ApiError(409, "Only submitted rosters can be reviewed");
  if (status === "Approved") roster.entries = await validateRoster(roster, roster.entries);
  else roster.rejectionReason = requireText(req.body.reason, "Rejection reason");
  roster.status = status; roster.approvedBy = req.user._id; roster.approvedAt = new Date();
  await roster.save(); res.json({ success: true, data: roster });
}
