import { Match, PickemEvent, Prediction } from "../models/index.js";

export function predictionWindow(bracket) {
  return {
    opensAt: bracket.predictionOpenAt || null,
    locksAt: bracket.predictionLockAt || null,
  };
}

export function isPredictionOpen(bracket, now = new Date()) {
  if (!bracket) return false;
  const { opensAt, locksAt } = predictionWindow(bracket);
  return bracket.status === "Published"
    && bracket.predictionEnabled !== false
    && Boolean(locksAt)
    && (!opensAt || now >= opensAt)
    && now < locksAt;
}

export function validatePrediction(participants, input, bestOf) {
  const teamAScore = Number(input.predictedTeam1Score);
  const teamBScore = Number(input.predictedTeam2Score);
  const winnerId = String(input.predictedWinnerTeamId || "");
  const teamAId = String(participants.teamAId || "");
  const teamBId = String(participants.teamBId || "");
  if (![teamAId, teamBId].includes(winnerId)) return "Predicted winner must be a team in this match";
  if (!Number.isInteger(teamAScore) || !Number.isInteger(teamBScore) || teamAScore < 0 || teamBScore < 0 || teamAScore === teamBScore) return "Prediction scores must be non-negative, unequal integers";
  if ((teamAScore > teamBScore ? teamAId : teamBId) !== winnerId) return "Predicted winner does not match the predicted score";
  if (bestOf != null && Math.max(teamAScore, teamBScore) !== Math.floor(bestOf / 2) + 1) return "Predicted score does not match the match best-of format";
  return null;
}

export async function resolvePredictedParticipants(userId, match) {
  const participants = { teamAId: match.teamAId || null, teamBId: match.teamBId || null };
  const feeders = await Match.find({ $or: [{ nextMatchId: match._id }, { loserNextMatchId: match._id }] }).select("_id nextMatchId nextMatchSlot loserNextMatchId loserNextMatchSlot isBye teamAId teamBId");
  const predictions = await Prediction.find({ userId, matchId: { $in: feeders.map((feeder) => feeder._id) }, status: { $ne: "Cancelled" } }).select("matchId predictedWinnerTeamId predictedTeam1Id predictedTeam2Id");
  const winnerByMatch = new Map(predictions.map((prediction) => [String(prediction.matchId), prediction.predictedWinnerTeamId]));
  for (const feeder of feeders) {
    const isWinnerPath = String(feeder.nextMatchId) === String(match._id);
    const prediction = predictions.find((p) => String(p.matchId) === String(feeder._id));
    const winner = feeder.isBye ? feeder.teamAId || feeder.teamBId : winnerByMatch.get(String(feeder._id));
    const selected = isWinnerPath ? winner : prediction && (String(winner) === String(prediction.predictedTeam1Id) ? prediction.predictedTeam2Id : prediction.predictedTeam1Id);
    const slot = isWinnerPath ? feeder.nextMatchSlot : feeder.loserNextMatchSlot;
    if (slot === "TeamA") participants.teamAId = selected || null;
    if (slot === "TeamB") participants.teamBId = selected || null;
  }
  return participants;
}

export async function deleteDownstreamPredictions(userId, matchId) {
  const match = await Match.findById(matchId).select("nextMatchId loserNextMatchId");
  for (const next of [match?.nextMatchId, match?.loserNextMatchId].filter(Boolean)) {
    await Prediction.deleteOne({ userId, matchId: next });
    await deleteDownstreamPredictions(userId, next);
  }
}

export async function scorePredictions(match, result) {
  if (result.status && result.status !== "Confirmed") return;
  const event = await PickemEvent.findOne({ matchId: match._id });
  const predictions = await Prediction.find({ matchId: match._id, status: { $ne: "Cancelled" } });
  if (!predictions.length) return;
  const scoredAt = new Date();
  await Promise.all(predictions.map(async (prediction) => {
    const correctWinner = String(prediction.predictedWinnerTeamId) === String(result.winnerTeamId);
    const sameOrder = String(prediction.predictedTeam1Id) === String(match.teamAId) && String(prediction.predictedTeam2Id) === String(match.teamBId);
    const reversedOrder = String(prediction.predictedTeam1Id) === String(match.teamBId) && String(prediction.predictedTeam2Id) === String(match.teamAId);
    const exactScore = sameOrder ? prediction.predictedTeam1Score === result.teamAScore && prediction.predictedTeam2Score === result.teamBScore
      : reversedOrder && prediction.predictedTeam1Score === result.teamBScore && prediction.predictedTeam2Score === result.teamAScore;
    prediction.status = "Scored";
    prediction.lockedAt ||= result.confirmedAt;
    prediction.scoredAt = scoredAt;
    prediction.actualWinnerTeamId = result.winnerTeamId;
    prediction.isCorrect = correctWinner;
    prediction.pointsAwarded = correctWinner ? (exactScore ? event?.scoring?.exactScorePoints ?? 3 : event?.scoring?.winnerPoints ?? 1) : 0;
    await prediction.save();
  }));
}
