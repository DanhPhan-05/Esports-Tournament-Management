import { Game, Team, Tournament } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";

export async function listGames(_req, res) {
  const games = await Game.find().sort({ name: 1 });
  const data = await Promise.all(games.map(async (game) => ({ ...game.toObject(), teamCount: await Team.countDocuments({ gameId: game._id }), tournamentCount: await Tournament.countDocuments({ gameId: game._id }) })));
  res.json({ success: true, data });
}

export async function saveGame(req, res) {
  const game = req.params.id
    ? await Game.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    : await Game.create(req.body);
  if (!game) throw new ApiError(404, "Game not found");
  res.status(req.params.id ? 200 : 201).json({ success: true, data: game });
}

export async function deactivateGame(req, res) {
  const game = await Game.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!game) throw new ApiError(404, "Game not found");
  res.json({ success: true, data: game });
}
