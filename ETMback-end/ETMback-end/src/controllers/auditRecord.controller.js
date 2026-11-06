import { AuditRecord } from "../models/index.js";
import { pagination } from "../utils/pagination.js";

export async function auditLog(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = { ...(req.query.action ? { action: req.query.action } : {}), ...(req.query.matchId ? { matchId: req.query.matchId } : {}), ...(req.query.actorId ? { actorId: req.query.actorId } : {}) };
  if (req.query.from || req.query.to) filter.createdAt = { ...(req.query.from ? { $gte: new Date(req.query.from) } : {}), ...(req.query.to ? { $lte: new Date(req.query.to) } : {}) };
  const [items, total] = await Promise.all([
    AuditRecord.find(filter).populate("actorId", "fullName email").populate({
      path: "matchId", select: "tournamentId round position section teamAId teamBId",
      populate: [
        { path: "tournamentId", select: "name" },
        { path: "teamAId", select: "name tag" },
        { path: "teamBId", select: "name tag" },
      ],
    }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditRecord.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total } });
}
