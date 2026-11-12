import { Bracket, Match, PickemEvent } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";

function dateTime(value) {
  // Missing dates must not become epoch (null) or poison Math.min (undefined).
  return value == null || value === "" ? NaN : new Date(value).getTime();
}
function predictionWindow(bracket) {
  const opensAt = dateTime(bracket?.predictionOpenAt);
  const lockAt = dateTime(bracket?.predictionLockAt);
  return Number.isFinite(opensAt) && Number.isFinite(lockAt) && opensAt < lockAt
    ? { opensAt: new Date(opensAt), lockAt } : null;
}
export function eventIsOpen(event, now = new Date()) {
  return Boolean(event && event.status === "Open" && now >= event.opensAt && now < event.lockAt);
}
export async function syncPickemEvents(bracket) {
  const window = predictionWindow(bracket);
  if (!window) {
    // Imported/legacy brackets may predate the required prediction dates.
    // Do not invent a deadline or reopen their events during maintenance.
    await PickemEvent.updateMany({ bracketId: bracket._id }, { status: "Cancelled" });
    return;
  }
  const matches = await Match.find({ bracketId: bracket._id });
  for (const match of matches) {
    const previous = await PickemEvent.findOne({ matchId: match._id });
    const scheduledAt = match.scheduledAt == null ? Infinity : dateTime(match.scheduledAt);
    const previousLockAt = previous ? dateTime(previous.lockAt) : Infinity;
    if (Number.isNaN(scheduledAt) || Number.isNaN(previousLockAt)) {
      await PickemEvent.updateMany({ matchId: match._id }, { status: "Cancelled" });
      continue;
    }
    const lockAt = new Date(Math.min(window.lockAt, scheduledAt, previousLockAt));
    const status = bracket.status !== "Published" || bracket.predictionEnabled === false || match.isBye || match.enabled === false || match.status === "Cancelled" ? "Cancelled" : new Date() >= lockAt || match.status === "Completed" ? "Locked" : "Open";
    await PickemEvent.findOneAndUpdate({ matchId: match._id }, { tournamentId: match.tournamentId, bracketId: bracket._id, opensAt: window.opensAt, lockAt, status }, { upsert: true, runValidators: true });
  }
}
export async function requireOpenEvent(match, now = new Date()) {
  const bracket = await Bracket.findById(match.bracketId);
  if (!bracket || !predictionWindow(bracket) || bracket.status !== "Published" || bracket.predictionEnabled === false || match.isBye || match.enabled === false || ["Completed", "Cancelled"].includes(match.status)) throw new ApiError(409, "Prediction event is not open");
  let event = await PickemEvent.findOne({ matchId: match._id });
  if (!event) { await syncPickemEvents(bracket); event = await PickemEvent.findOne({ matchId: match._id }); }
  if (match.scheduledAt && now >= match.scheduledAt || !eventIsOpen(event, now)) throw new ApiError(409, "Prediction event is locked or not yet open");
  return event;
}
