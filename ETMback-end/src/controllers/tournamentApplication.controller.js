import { Ban, Club, Roster, Tournament, TournamentApplication } from "../models/index.js";
import { requireManagedTeam } from "../services/access.service.js";
import { notify } from "../services/notification.service.js";
import { ApiError } from "../utils/ApiError.js";
import { validateRoster } from "../services/roster.service.js";
import { evidence, pick, requireText } from "../utils/input.js";
import { Team } from "../models/index.js";
import { withTournamentLock } from "../services/matchResult.service.js";

async function organizerApplication(req, id) {
  const application = await TournamentApplication.findById(id).populate("tournamentId");
  if (application && req.params.tournamentId && String(application.tournamentId._id) !== String(req.params.tournamentId)) throw new ApiError(404, "Application is not in this tournament");
  if (!application || (req.user.systemRole !== "Administrator" && String(application.tournamentId.organizerAccountId) !== String(req.user._id))) {
    throw new ApiError(404, "Application not found");
  }
  return application;
}

export async function createApplication(req, res) {
  const tournament = await Tournament.findById(req.body.tournamentId);
  const team = await requireManagedTeam(req, req.body.teamId);
  if (!tournament || tournament.status !== "RegistrationOpen" || new Date() < tournament.registrationOpenAt || new Date() >= tournament.registrationCloseAt) throw new ApiError(409, "Tournament registration is not open");
  if (team.status !== "Active") throw new ApiError(422, "Team is inactive");
  if (String(team.gameId) !== String(tournament.gameId)) throw new ApiError(422, "Team game does not match tournament game");
  if (await Ban.exists({ clubId: team.clubId, status: "Active", startsAt: { $lte: new Date() }, $or: [{ endsAt: null }, { endsAt: { $gte: new Date() } }] })) throw new ApiError(403, "Club is currently banned");
  const application = await TournamentApplication.create({ tournamentId: tournament._id, teamId: team._id, submittedBy: req.user._id, note: req.body.note });
  const roster = await Roster.create({ applicationId: application._id, tournamentId: tournament._id, teamId: team._id });
  res.status(201).json({ success: true, data: { application, roster } });
}

export async function myApplications(req, res) {
  const clubs = await Club.find({ managerAccountIds: req.user._id }).select("_id");
  const teams = await Team.find({ clubId: { $in: clubs.map((club) => club._id) } }).distinct("_id");
  const items = await TournamentApplication.find({ teamId: { $in: teams } }).populate("tournamentId teamId").sort({ createdAt: -1 });
  res.json({ success: true, data: items });
}

export async function tournamentApplications(req, res) {
  const tournament = await Tournament.findById(req.params.tournamentId);
  if (!tournament || (req.user.systemRole !== "Administrator" && String(tournament.organizerAccountId) !== String(req.user._id))) throw new ApiError(404, "Tournament not found");
  const filter = { tournamentId: tournament._id, ...(req.query.status ? { status: req.query.status } : {}) };
  const items = await TournamentApplication.find(filter).populate("teamId", "name tag clubId").populate("submittedBy", "fullName email").sort({ submittedAt: 1 });
  res.json({ success: true, data: items });
}

export async function submitApplication(req, res) {
  const application = await TournamentApplication.findById(req.params.id);
  if (!application) throw new ApiError(404, "Application not found");
  await requireManagedTeam(req, application.teamId);
  const tournament = await Tournament.findById(application.tournamentId);
  const roster = await Roster.findOne({ applicationId: application._id });
  if (!["Draft", "NeedMoreInfo"].includes(application.status)) throw new ApiError(409, "Application is not editable");
  if (tournament.status !== "RegistrationOpen" || new Date() < tournament.registrationOpenAt || new Date() >= tournament.registrationCloseAt) throw new ApiError(409, "Registration is closed");
  roster.entries = await validateRoster(roster, roster.entries);
  application.status = "Submitted"; application.submittedAt = new Date();
  roster.status = "Submitted"; roster.submittedAt = new Date();
  await application.save(); await roster.save();
  res.json({ success: true, data: application });
}

async function reviewApplicationUnlocked(req, res) {
  const application = await organizerApplication(req, req.params.id);
  if (application.status === req.body.status) return res.json({ success: true, data: application });
  if (!["Submitted", "UnderReview", "NeedMoreInfo"].includes(application.status)) throw new ApiError(409, "Application cannot be reviewed in its current state");
  if (!["UnderReview", "NeedMoreInfo", "Approved", "Rejected"].includes(req.body.status)) throw new ApiError(422, "Invalid review status");
  if (["Rejected", "NeedMoreInfo"].includes(req.body.status)) requireText(req.body.reviewNote, "Review explanation");
  if (req.body.status === "Approved" && await TournamentApplication.countDocuments({ tournamentId: application.tournamentId._id, status: "Approved" }) >= application.tournamentId.maxTeams) throw new ApiError(409, "Tournament team limit reached");
  application.status = req.body.status; application.reviewNote = req.body.reviewNote; application.reviewedBy = req.user._id; application.reviewedAt = new Date();
  await application.save();
  await notify(application.submittedBy, "APPLICATION_STATUS", { status: application.status, tournament: application.tournamentId.name }, `/applications/${application._id}`, { eventKey: `application:${application._id}:${application.status}:${application.reviewedAt.getTime()}` });
  res.json({ success: true, data: application });
}
export async function reviewApplication(req, res) {
  const item = await organizerApplication(req, req.params.id);
  return withTournamentLock(item.tournamentId._id, () => reviewApplicationUnlocked(req, res));
}

export async function applicationDetail(req, res) {
  const application = req.user.systemRole === "ClubManager" ? await TournamentApplication.findById(req.params.id) : await organizerApplication(req, req.params.id);
  if (!application) throw new ApiError(404, "Application not found");
  if (req.user.systemRole === "ClubManager") await requireManagedTeam(req, application.teamId);
  await application.populate([{ path: "teamId", populate: { path: "gameId", select: "name slug" } }, { path: "tournamentId" }]);
  res.json({ success: true, data: { application, roster: await Roster.findOne({ applicationId: application._id }) } });
}
export async function updateApplication(req, res) {
  const item = await TournamentApplication.findById(req.params.id);
  if (!item) throw new ApiError(404, "Application not found");
  await requireManagedTeam(req, item.teamId);
  if (!["Draft", "NeedMoreInfo"].includes(item.status)) throw new ApiError(409, "Application cannot be edited");
  Object.assign(item, pick(req.body, ["note"]));
  if (req.body.documents) item.documents = evidence(req.body.documents);
  await item.save(); res.json({ success: true, data: item });
}
export async function withdrawApplication(req, res) {
  const item = await TournamentApplication.findById(req.params.id);
  if (!item) throw new ApiError(404, "Application not found");
  await requireManagedTeam(req, item.teamId);
  const tournament = await Tournament.findById(item.tournamentId);
  if (new Date() >= tournament.registrationCloseAt || ["Approved", "Rejected", "Withdrawn"].includes(item.status)) throw new ApiError(409, "Application can no longer be withdrawn");
  item.status = "Withdrawn"; await item.save();
  res.json({ success: true, data: item });
}
