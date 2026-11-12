import { Bracket, Match, MatchResult, PickemEvent, Prediction, Tournament } from "../models/index.js";
import { requireOpenEvent, syncPickemEvents } from "../services/pickemEvent.service.js";
import { deleteDownstreamPredictions, isPredictionOpen, predictionWindow, resolvePredictedParticipants, validatePrediction } from "../services/prediction.service.js";
import { ApiError } from "../utils/ApiError.js";
import { pagination } from "../utils/pagination.js";

export async function predictionEvents(req, res) {
  const now = new Date();
  const catalogue = req.query.view === "all";
  const tournaments = await Tournament.find({ status: { $nin: ["Draft", "Cancelled"] } }).select("_id");
  const brackets = await Bracket.find({
    status: "Published",
    tournamentId: { $in: tournaments.map(t => t._id) },
    predictionEnabled: { $ne: false },
    ...(!catalogue ? { predictionOpenAt: { $lte: now }, predictionLockAt: { $gt: now } } : {}),
  }).populate({ path: "tournamentId", select: "name slug bannerUrl startAt endAt status gameId tournamentType", populate: { path: "gameId", select: "name logoUrl" } }).sort({ predictionLockAt: -1 });
  const data = await Promise.all(brackets.map(async (bracket) => {
    await syncPickemEvents(bracket);
    const events = await PickemEvent.find({ bracketId: bracket._id });
    const matches = await Match.find({ bracketId: bracket._id }).populate("teamAId teamBId", "name tag logoUrl").sort({ round: 1, position: 1 });
    const results = await MatchResult.find({ matchId: { $in: matches.map(m => m._id) }, status: "Confirmed" }).select("matchId teamAScore teamBScore winnerTeamId");
    const predictions = await Prediction.find({ userId: req.user._id, bracketId: bracket._id }).populate("predictedTeam1Id predictedTeam2Id predictedWinnerTeamId", "name tag logoUrl");
    const byMatch = new Map(predictions.map((prediction) => [String(prediction.matchId), prediction]));
    const matchData = await Promise.all(matches.map(async (match) => ({
      ...match.toObject(),
      availableParticipants: await resolvePredictedParticipants(req.user._id, match),
      myPrediction: byMatch.get(String(match._id)) || null,
      event: events.find((event) => String(event.matchId) === String(match._id)) || null,
      result: results.find(result => String(result.matchId) === String(match._id)) || null,
      canPredict: isPredictionOpen(bracket, now) && match.enabled !== false && !match.isBye && !["Completed", "Cancelled"].includes(match.status) && events.some(event => String(event.matchId) === String(match._id) && event.status === "Open" && now >= event.opensAt && now < event.lockAt),
    })));
    const eligible = matchData.filter(m => m.enabled !== false && !m.isBye && m.status !== "Cancelled");
    return { ...bracket.toObject(), predictionWindow: predictionWindow(bracket), matches: matchData,
      summary: { total: eligible.length, picked: eligible.filter(m => m.myPrediction && m.myPrediction.status !== "Cancelled").length, points: predictions.reduce((sum, p) => sum + (p.status === "Scored" ? p.pointsAwarded : 0), 0) },
    };
  }));
  res.json({ success: true, data: data.filter((item) => item.matches.length) });
}

export async function createPrediction(req, res) {
  const match = await Match.findById(req.body.matchId);
  if (!match) throw new ApiError(404, "Match not found");
  const bracket = await Bracket.findById(match.bracketId);
  await requireOpenEvent(match);
  if (!isPredictionOpen(bracket)) throw new ApiError(409, "Prediction is not open for this bracket");
  const participants = await resolvePredictedParticipants(req.user._id, match);
  if (!participants.teamAId || !participants.teamBId) throw new ApiError(409, "Predict the feeder matches before predicting this match");
  const validationError = validatePrediction(participants, req.body, match.bestOf);
  if (validationError) throw new ApiError(422, validationError);
  if (await Prediction.exists({ userId: req.user._id, matchId: match._id })) throw new ApiError(409, "A prediction already exists for this match");
  const prediction = await Prediction.create({
    userId: req.user._id,
    tournamentId: match.tournamentId,
    bracketId: bracket._id,
    matchId: match._id,
    predictedTeam1Id: participants.teamAId,
    predictedTeam2Id: participants.teamBId,
    predictedWinnerTeamId: req.body.predictedWinnerTeamId,
    predictedTeam1Score: req.body.predictedTeam1Score,
    predictedTeam2Score: req.body.predictedTeam2Score,
    submittedAt: new Date(),
  });
  res.status(201).json({ success: true, data: prediction });
}

export async function myPredictions(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = { userId: req.user._id };
  const [items, total] = await Promise.all([
    Prediction.find(filter).populate("predictedTeam1Id predictedTeam2Id predictedWinnerTeamId actualWinnerTeamId", "name tag logoUrl").populate({ path: "matchId", select: "round position nextMatchId nextMatchSlot teamAId teamBId bestOf",populate:{path:"teamAId teamBId",select:"name tag logoUrl"} }).populate("tournamentId", "name slug").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Prediction.countDocuments(filter),
  ]);
  const results=await MatchResult.find({matchId:{$in:items.map(p=>p.matchId?._id).filter(Boolean)},status:"Confirmed"}).select("matchId teamAScore teamBScore winnerTeamId confirmedAt");
  res.json({ success: true, data: items.map(p=>({...p.toObject(),actualResult:results.find(r=>String(r.matchId)===String(p.matchId?._id))||null})), pagination: { page, limit, total } });
}

export async function updatePrediction(req, res) {
  const prediction = await Prediction.findOne({ _id: req.params.id, userId: req.user._id });
  if (!prediction) throw new ApiError(404, "Prediction not found");
  const match = await Match.findById(prediction.matchId);
  const bracket = await Bracket.findById(prediction.bracketId);
  await requireOpenEvent(match);
  if (prediction.status !== "Active" || !isPredictionOpen(bracket)) throw new ApiError(409, "Prediction is locked");
  const participants = await resolvePredictedParticipants(req.user._id, match);
  const validationError = validatePrediction(participants, req.body, match.bestOf);
  if (validationError) throw new ApiError(422, validationError);
  const winnerChanged = String(prediction.predictedWinnerTeamId) !== String(req.body.predictedWinnerTeamId);
  prediction.predictedTeam1Id = participants.teamAId;
  prediction.predictedTeam2Id = participants.teamBId;
  prediction.predictedWinnerTeamId = req.body.predictedWinnerTeamId;
  prediction.predictedTeam1Score = req.body.predictedTeam1Score;
  prediction.predictedTeam2Score = req.body.predictedTeam2Score;
  prediction.submittedAt = new Date();
  await prediction.save();
  if (winnerChanged) await deleteDownstreamPredictions(req.user._id, match._id);
  res.json({ success: true, data: prediction });
}

export async function deletePrediction(req, res) {
  const prediction = await Prediction.findOne({ _id: req.params.id, userId: req.user._id });
  if (!prediction) throw new ApiError(404, "Prediction not found");
  const match = await Match.findById(prediction.matchId);
  const bracket = await Bracket.findById(prediction.bracketId);
  await requireOpenEvent(match);
  if (prediction.status !== "Active" || !isPredictionOpen(bracket)) throw new ApiError(409, "Prediction is locked");
  await prediction.deleteOne();
  await deleteDownstreamPredictions(req.user._id, match._id);
  res.status(204).end();
}

export async function leaderboard(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const rows = await Prediction.aggregate([
    { $match: { status: "Scored" } },
    { $group: { _id: "$userId", points: { $sum: "$pointsAwarded" }, correctPredictions: { $sum: { $cond: ["$isCorrect", 1, 0] } }, totalPredictions: { $sum: 1 } } },
    { $sort: { points: -1, correctPredictions: -1 } },
    { $limit: limit },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $project: { _id: 0, userId: "$_id", fullName: "$user.fullName", avatarUrl: "$user.avatarUrl", points: 1, correctPredictions: 1, totalPredictions: 1 } },
  ]);
  res.json({ success: true, data: rows.map((row, index) => ({ rank: index + 1, ...row })) });
}
