import { Ban, Bracket, PickemEvent, Prediction, Tournament } from "../models/index.js";
import { retryNotifications } from "./notification.service.js";
import { reconcileTournament, withTournamentLock } from "./matchResult.service.js";

export async function runMaintenance(now = new Date()) {
  await Ban.updateMany({ status: "Active", endsAt: { $ne: null, $lte: now } }, { status: "Expired" });
  await Tournament.updateMany({ status: "RegistrationOpen", registrationCloseAt: { $lte: now } }, { status: "RegistrationClosed" });
  await PickemEvent.updateMany({ status: "Open", lockAt: { $lte: now } }, { status: "Locked" });
  const locked = await PickemEvent.find({ status: "Locked" }).distinct("matchId");
  await Prediction.updateMany({ matchId: { $in: locked }, status: "Active" }, { status: "Locked", lockedAt: now });
  await retryNotifications(now);
  const brackets = await Bracket.find({ status: "Published" }).select("tournamentId").limit(100);
  for (const bracket of brackets) {
    try { await withTournamentLock(bracket.tournamentId, () => reconcileTournament(bracket.tournamentId)); }
    catch (error) { if (error.statusCode !== 409) throw error; }
  }
}
export function startMaintenance() {
  let running = false;
  const tick = async () => {
    if (running) return; running = true;
    try { await runMaintenance(); } catch (error) { console.error("Maintenance failed", error.message); } finally { running = false; }
  };
  const timer = setInterval(tick, 30000); timer.unref();
  void tick(); return () => clearInterval(timer);
}
