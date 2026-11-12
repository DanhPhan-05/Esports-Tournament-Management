import { Club, ClubMember, Roster, Team } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { hashCitizenId } from "../utils/crypto.js";
import { assertDateOrder } from "../utils/dates.js";
import { pagination } from "../utils/pagination.js";
import { pick } from "../utils/input.js";

async function requireManagedClub(user, clubId) {
  const filter = user.systemRole === "Administrator" ? { _id: clubId } : { _id: clubId, managerAccountIds: user._id };
  const club = await Club.findOne(filter);
  if (!club) throw new ApiError(404, "Club not found or not managed by this account");
  return club;
}

export async function listMembers(req, res) {
  await requireManagedClub(req.user, req.params.clubId);
  const { page, limit, skip } = pagination(req.query);
  const filter = { clubId: req.params.clubId, ...(req.query.teamId ? { teamId: req.query.teamId } : {}) };
  if (req.query.from) filter.$or = [{ activeUntil: null }, { activeUntil: { $gte: new Date(req.query.from) } }];
  if (req.query.to) filter.activeFrom = { $lte: new Date(req.query.to) };
  const [items, total] = await Promise.all([ClubMember.find(filter).populate("teamId").skip(skip).limit(limit), ClubMember.countDocuments(filter)]);
  res.json({ success: true, data: items.map((item) => ({ ...item.toObject(), citizenId: `********${item.citizenIdLast4}` })), pagination: { page, limit, total } });
}

export async function createMember(req, res) {
  const club = await requireManagedClub(req.user, req.params.clubId);
  assertDateOrder(req.body.activeFrom, req.body.activeUntil, "membership period");
  const identity = hashCitizenId(req.body.citizenId);
  const overlapping = await ClubMember.findOne({ citizenIdHash: identity.citizenIdHash, clubId: { $ne: club._id }, activeFrom: { $lte: req.body.activeUntil ? new Date(req.body.activeUntil) : new Date("9999-12-31") }, $or: [{ activeUntil: null }, { activeUntil: { $gte: new Date(req.body.activeFrom) } }] }).populate("clubId", "name");
  const warning = overlapping ? `Activity period overlaps with club ${overlapping.clubId.name}` : null;
  if (req.body.teamId && !(await Team.exists({ _id: req.body.teamId, clubId: club._id }))) throw new ApiError(422, "Team must belong to this club");
  const input = pick(req.body, ["fullName", "dateOfBirth", "nationality", "inGameName", "teamRole", "teamId", "activeFrom", "activeUntil"]);
  const team = req.body.teamId ? await Team.findById(req.body.teamId) : null;
  const member = await ClubMember.create({ ...input, ...identity, gameId: team?.gameId, clubId: club._id, createdBy: req.user._id });
  res.status(201).json({ success: true, data: member, warning });
}

export async function updateMember(req, res) {
  await requireManagedClub(req.user, req.params.clubId);
  const member = await ClubMember.findOne({ _id: req.params.memberId, clubId: req.params.clubId });
  if (!member) throw new ApiError(404, "Member not found");
  if (!member.gameId && member.teamId) member.gameId = (await Team.findById(member.teamId))?.gameId;
  for (const key of ["fullName", "dateOfBirth", "nationality", "inGameName", "teamRole", "teamId", "activeFrom", "activeUntil", "status"]) if (key in req.body) member[key] = req.body[key];
  assertDateOrder(member.activeFrom, member.activeUntil, "membership period");
  if (member.teamId && !(await Team.exists({ _id: member.teamId, clubId: member.clubId }))) throw new ApiError(422, "Team must belong to this club");
  if (member.teamId) {
    const team = await Team.findById(member.teamId);
    if (team.status !== "Active" || member.gameId && String(member.gameId) !== String(team.gameId)) throw new ApiError(422, "Member cannot move to a team in a different game or an inactive team");
    member.gameId ||= team.gameId;
  }
  const overlap = await ClubMember.exists({ _id: { $ne: member._id }, citizenIdHash: member.citizenIdHash, clubId: { $ne: member.clubId }, activeFrom: { $lte: member.activeUntil || new Date("9999-12-31") }, $or: [{ activeUntil: null }, { activeUntil: { $gte: member.activeFrom } }] });
  await member.save();
  res.json({ success: true, data: member, warning: overlap ? "Activity period overlaps with another club" : null });
}
export async function endMember(req, res) {
  await requireManagedClub(req.user, req.params.clubId);
  const member = await ClubMember.findOne({ _id: req.params.memberId, clubId: req.params.clubId });
  if (!member) throw new ApiError(404, "Member not found");
  if (req.query.hard === "true") {
    if (await Roster.exists({ "entries.clubMemberId": member._id })) throw new ApiError(409, "Member is referenced by a roster");
    await member.deleteOne(); return res.status(204).end();
  }
  member.activeUntil = new Date(req.body.activeUntil || new Date()); member.status = "Inactive";
  assertDateOrder(member.activeFrom, member.activeUntil, "membership period");
  await member.save(); res.json({ success: true, data: member });
}
