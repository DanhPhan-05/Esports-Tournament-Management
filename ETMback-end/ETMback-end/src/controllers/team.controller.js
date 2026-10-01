import { Club, ClubMember, Game, Team } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";

async function requireManagedClub(user, clubId) {
  const filter = user.systemRole === "Administrator" ? { _id: clubId } : { _id: clubId, managerAccountIds: user._id };
  if (!(await Club.exists(filter))) throw new ApiError(404, "Club not found or not managed by this account");
}

export async function listTeams(req, res) {
  await requireManagedClub(req.user, req.params.clubId);
  res.json({ success: true, data: await Team.find({ clubId: req.params.clubId, ...(req.query.gameId ? { gameId: req.query.gameId } : {}), ...(req.query.status ? { status: req.query.status } : {}) }).populate("gameId") });
}

export async function createTeam(req, res) {
  await requireManagedClub(req.user, req.params.clubId);
  if (!(await Game.exists({ _id: req.body.gameId, isActive: true }))) throw new ApiError(422, "Active game is required");
  const team = await Team.create({ name: req.body.name, tag: req.body.tag, logoUrl: req.body.logoUrl, gameId: req.body.gameId, clubId: req.params.clubId, createdBy: req.user._id });
  res.status(201).json({ success: true, data: team });
}
export async function deactivateTeam(req, res) {
  await requireManagedClub(req.user, req.params.clubId);
  const team = await Team.findById(req.params.teamId);
  if (!team) throw new ApiError(404, "Team not found");
  if (req.body.gameId && String(req.body.gameId) !== String(team.gameId)) throw new ApiError(422, "A team's game cannot be changed; create a new team instead");
  team.status = "Inactive"; await team.save();
  await ClubMember.updateMany({ teamId: team._id }, { teamId: null });
  res.json({ success: true, data: team });
}

export async function updateTeam(req, res) {
  await requireManagedClub(req.user, req.params.clubId);
  const team = await Team.findOne({ _id: req.params.teamId, clubId: req.params.clubId });
  if (!team) throw new ApiError(404, "Team not found");
  for (const key of ["name", "tag", "logoUrl", "status"]) if (key in req.body) team[key] = req.body[key];
  await team.save();
  res.json({ success: true, data: team });
}
