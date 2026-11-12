import { Roster, RosterChangeRequest, Tournament } from "../models/index.js";
import { requireManagedTeam } from "../services/access.service.js";
import { ApiError } from "../utils/ApiError.js";
import { validateRoster } from "../services/roster.service.js";
import { requireText } from "../utils/input.js";
import { requireOwnedTournament } from "../services/access.service.js";

export async function listRosterChanges(req, res) {
  const roster = await Roster.findById(req.params.rosterId);
  if (!roster) throw new ApiError(404, "Roster not found");
  if (req.user.systemRole === "ClubManager") await requireManagedTeam(req, roster.teamId);
  else await requireOwnedTournament(req, roster.tournamentId);
  const items = await RosterChangeRequest.find({ rosterId: roster._id }).populate("addMemberIds removeMemberIds", "fullName inGameName citizenIdLast4").sort({ createdAt: -1 });
  res.json({ success: true, data: items });
}

export async function createRosterChange(req, res) {
  const roster = await Roster.findById(req.params.id);
  if (!roster) throw new ApiError(404, "Roster not found");
  await requireManagedTeam(req, roster.teamId);
  requireText(req.body.reason);
  if (!["Approved", "Locked"].includes(roster.status)) throw new ApiError(409, "Only approved or locked rosters require a change request");
  if (!Array.isArray(req.body.addMemberIds) || !Array.isArray(req.body.removeMemberIds) || !req.body.addMemberIds.length && !req.body.removeMemberIds.length) throw new ApiError(422, "Nonempty add/remove arrays are required");
  if (new Set(req.body.addMemberIds.map(String)).size !== req.body.addMemberIds.length || new Set(req.body.removeMemberIds.map(String)).size !== req.body.removeMemberIds.length) throw new ApiError(422, "Duplicate change members");
  if (req.body.addMemberIds.some((id) => req.body.removeMemberIds.map(String).includes(String(id)))) throw new ApiError(422, "Cannot add and remove the same member");
  if (req.body.removeMemberIds.some((id) => !roster.entries.some((entry) => String(entry.clubMemberId) === String(id)))) throw new ApiError(422, "Removed member is not in the roster");
  const tournament = await Tournament.findById(roster.tournamentId);
  if (["Completed", "Cancelled"].includes(tournament.status)) throw new ApiError(409, "Tournament is closed");
  const request = await RosterChangeRequest.create({ rosterId: roster._id, requestedBy: req.user._id, addMemberIds: req.body.addMemberIds, removeMemberIds: req.body.removeMemberIds, reason: req.body.reason });
  res.status(201).json({ success: true, data: request });
}

export async function reviewRosterChange(req, res) {
  const request = await RosterChangeRequest.findById(req.params.id).populate({ path: "rosterId", populate: { path: "tournamentId" } });
  if (!request || (req.user.systemRole !== "Administrator" && String(request.rosterId.tournamentId.organizerAccountId) !== String(req.user._id))) throw new ApiError(404, "Change request not found");
  if (request.status !== "Pending" || !["Approved", "Rejected"].includes(req.body.status)) throw new ApiError(409, "Change request cannot be reviewed");
  if (["Completed", "Cancelled"].includes(request.rosterId.tournamentId.status)) throw new ApiError(409, "Tournament is closed");
  if (req.body.status === "Approved") {
    const remove = new Set(request.removeMemberIds.map(String));
    const current = request.rosterId.entries.filter((entry) => !remove.has(String(entry.clubMemberId)));
    request.rosterId.entries = await validateRoster(request.rosterId, [...current, ...request.addMemberIds.map((id) => ({ clubMemberId: id, role: "Player" }))]);
    await request.rosterId.save();
  }
  request.status = req.body.status; request.reviewedBy = req.user._id; request.reviewedAt = new Date(); request.reviewNote = req.body.reviewNote;
  await request.save();
  res.json({ success: true, data: request });
}
