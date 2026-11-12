import { ClubMember, Team, Tournament } from "../models/index.js";
import { assertRosterNotBanned } from "./ban.service.js";
import { ApiError } from "../utils/ApiError.js";

export async function validateRoster(roster, entries, { enforceSize = true } = {}) {
  const team = await Team.findById(roster.teamId), tournament = await Tournament.findById(roster.tournamentId);
  if (!team || !tournament || team.status !== "Active" || String(team.gameId) !== String(tournament.gameId)) throw new ApiError(422, "Roster team is inactive or incompatible with tournament");
  if (!Array.isArray(entries)) throw new ApiError(422, "Roster entries must be an array");
  if (enforceSize && (entries.length < tournament.minRosterSize || entries.length > tournament.maxRosterSize)) throw new ApiError(422, "Roster size is outside tournament limits");
  const ids = entries.map((entry) => String(entry.clubMemberId));
  if (new Set(ids).size !== ids.length) throw new ApiError(422, "Roster contains duplicate members");
  const members = await ClubMember.find({ _id: { $in: ids }, clubId: team.clubId, teamId: team._id, status: "Active", activeFrom: { $lte: tournament.startAt }, $or: [{ activeUntil: null }, { activeUntil: { $gte: tournament.endAt } }] });
  if (members.length !== ids.length) throw new ApiError(422, "Roster members must belong to this team and be active throughout the tournament");
  if (entries.some((entry) => !["Player", "Captain", "Substitute"].includes(entry.role || "Player"))) throw new ApiError(422, "Invalid roster role");
  await assertRosterNotBanned(team.clubId, ids);
  return entries.map((entry) => ({ clubMemberId: entry.clubMemberId, role: entry.role || "Player", inGameName: members.find((m) => String(m._id) === String(entry.clubMemberId)).inGameName }));
}
