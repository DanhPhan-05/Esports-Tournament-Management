import { Club, Team, Tournament } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { assertAccountNotBanned } from "./ban.service.js";

export async function requireManagedTeam(req, teamId) {
  if (!["GET", "HEAD"].includes(req.method)) await assertAccountNotBanned(req.user._id, "Competition");
  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");
  if (req.user.systemRole !== "Administrator" && !(await Club.exists({ _id: team.clubId, managerAccountIds: req.user._id }))) {
    throw new ApiError(403, "Team is not managed by this account");
  }
  return team;
}

export async function requireOwnedTournament(req, tournamentId) {
  if (!["GET", "HEAD"].includes(req.method)) await assertAccountNotBanned(req.user._id, "Competition");
  const filter = req.user.systemRole === "Administrator"
    ? { _id: tournamentId }
    : { _id: tournamentId, organizerAccountId: req.user._id };
  const tournament = await Tournament.findOne(filter);
  if (!tournament) throw new ApiError(404, "Tournament not found");
  return tournament;
}
