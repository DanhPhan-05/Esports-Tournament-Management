import { Ban, Club, ClubMember } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";

export function effectiveBan(now = new Date()) {
  return { status: "Active", startsAt: { $lte: now }, $or: [{ endsAt: null }, { endsAt: { $gt: now } }] };
}
export async function assertAccountNotBanned(accountId, scope = "System") {
  if (await Ban.exists({ ...effectiveBan(), targetType: "Account", accountId, ...(scope === "System" ? { scope: { $ne: "Competition" } } : {}) })) throw new ApiError(403, "Account is banned");
}
export async function assertRosterNotBanned(clubId, memberIds) {
  const club = await Club.findById(clubId);
  if (!club || club.status !== "Active" || await Ban.exists({ ...effectiveBan(), targetType: "Club", clubId })) throw new ApiError(403, "Club is inactive or banned");
  const hashes = await ClubMember.find({ _id: { $in: memberIds } }).distinct("citizenIdHash");
  if (await Ban.exists({ ...effectiveBan(), targetType: "Individual", citizenIdHash: { $in: hashes } })) throw new ApiError(403, "Roster contains a banned individual");
}
