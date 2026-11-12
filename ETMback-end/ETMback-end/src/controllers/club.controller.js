import { Club, User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { pick } from "../utils/input.js";

async function managedClub(user, clubId) {
  const filter = { _id: clubId };
  if (user.systemRole === "ClubManager") filter.managerAccountIds = user._id;
  const club = await Club.findOne(filter);
  if (!club) throw new ApiError(404, "Club not found or not managed by this account");
  return club;
}

export async function listMyClubs(req, res) {
  const filter = req.user.systemRole === "Administrator" ? {} : { managerAccountIds: req.user._id };
  res.json({ success: true, data: await Club.find(filter).sort({ name: 1 }) });
}

export async function getClub(req, res) {
  res.json({ success: true, data: await managedClub(req.user, req.params.clubId) });
}

export async function updateClub(req, res) {
  const club = await managedClub(req.user, req.params.clubId);
  for (const key of ["name", "shortName", "logoUrl", "description", "country", "region", "contactEmail", "contactPhone"]) if (key in req.body) club[key] = req.body[key];
  await club.save();
  res.json({ success: true, data: club });
}

export async function createClub(req, res) {
  const data = pick(req.body, ["name", "shortName", "logoUrl", "description", "country", "region", "contactEmail", "contactPhone"]);
  const club = await Club.create({ ...data, ...(req.user.systemRole === "ClubManager" ? { managerAccountIds: [req.user._id] } : {}), createdBy: req.user._id });
  res.status(201).json({ success: true, data: club });
}
export async function updateAdminClub(req, res) {
  const club = await Club.findById(req.params.id);
  if (!club) throw new ApiError(404, "Club not found");
  Object.assign(club, pick(req.body, ["status", "isVerified", "name", "description", "logoUrl"]));
  if (req.body.managerAccountId) {
    const manager = await User.findOne({ _id: req.body.managerAccountId, systemRole: "ClubManager", status: "Active" });
    if (!manager) throw new ApiError(422, "Active club manager required");
    club.managerAccountIds = [manager._id];
  }
  await club.save(); res.json({ success: true, data: club });
}
export async function deactivateClub(req, res) { req.body = { status: "Inactive" }; return updateAdminClub(req, res); }

export async function assignClubManager(req, res) {
  const manager = await User.findOne({ _id: req.body.managerAccountId, systemRole: "ClubManager", status: "Active" });
  if (!manager) throw new ApiError(422, "Active club manager account required");
  const club = await Club.findByIdAndUpdate(req.params.id, { $addToSet: { managerAccountIds: manager._id } }, { new: true });
  if (!club) throw new ApiError(404, "Club not found");
  res.json({ success: true, data: club });
}
