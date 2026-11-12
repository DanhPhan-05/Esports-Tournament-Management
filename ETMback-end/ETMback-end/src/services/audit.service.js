import { AuditRecord } from "../models/index.js";

export function recordMatchResultAudit(req, match, result, previousResult = null) {
  return AuditRecord.create({
    actorId: req.user._id,
    matchId: match._id,
    matchResultId: result._id,
    action: previousResult ? "Updated" : "Created",
    previousScore: previousResult ? { teamAScore: previousResult.teamAScore, teamBScore: previousResult.teamBScore } : undefined,
    newScore: { teamAScore: result.teamAScore, teamBScore: result.teamBScore },
    reason: result.correctionReason,
    resultRevision: result.revision,
  });
}
