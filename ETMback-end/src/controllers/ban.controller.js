import { Ban, Club, User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { hashCitizenId } from "../utils/crypto.js";
import { pick, requireText } from "../utils/input.js";
import { pagination } from "../utils/pagination.js";

export async function createBan(req, res) {
  const data = { ...pick(req.body, ["targetType", "accountId", "clubId", "reason", "startsAt", "endsAt", "scope"]), createdBy: req.user._id };
  if (req.body.targetType === "Individual") Object.assign(data, hashCitizenId(req.body.citizenId));
  if (data.targetType === "Account" && !await User.exists({ _id: data.accountId })) throw new ApiError(422, "Account target does not exist");
  if (data.targetType === "Club" && !await Club.exists({ _id: data.clubId })) throw new ApiError(422, "Club target does not exist");
  delete data.citizenId;
  const ban = await Ban.create(data);
  res.status(201).json({ success: true, data: ban });
}

export async function listBans(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = pick(req.query, ["targetType", "status"]);
  const [items, total] = await Promise.all([Ban.find(filter).select("-citizenIdHash").sort({ createdAt: -1 }).skip(skip).limit(limit), Ban.countDocuments(filter)]);
  res.json({ success: true, data: items, pagination: { page, limit, total } });
}
export async function updateBan(req, res) {
  const ban = await Ban.findById(req.params.id);
  if (!ban) throw new ApiError(404, "Ban not found");
  if (ban.status !== "Active") throw new ApiError(409, "Only active bans can be edited");
  requireText(req.body.reason);
  Object.assign(ban, pick(req.body, ["reason", "endsAt", "scope"]));
  await ban.save(); res.json({ success: true, data: ban });
}

export async function revokeBan(req, res) {
  const ban = await Ban.findOneAndUpdate({ _id: req.params.id, status: "Active" }, { status: "Revoked", revokedBy: req.user._id, revokedAt: new Date() }, { new: true });
  if (!ban) throw new ApiError(404, "Active ban not found");
  res.json({ success: true, data: ban });
}
