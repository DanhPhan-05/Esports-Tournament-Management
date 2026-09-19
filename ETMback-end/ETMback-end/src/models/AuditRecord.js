import mongoose from "mongoose";

const auditRecordSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true, index: true },
  matchResultId: { type: mongoose.Schema.Types.ObjectId, ref: "MatchResult", required: true, index: true },
  action: { type: String, enum: ["Created", "Updated"], required: true, index: true },
  previousScore: {
    teamAScore: { type: Number, min: 0 },
    teamBScore: { type: Number, min: 0 },
  },
  newScore: {
    teamAScore: { type: Number, required: true, min: 0 },
    teamBScore: { type: Number, required: true, min: 0 },
  },
  reason: String,
  resultRevision: Number,
}, { timestamps: { createdAt: true, updatedAt: false } });

for (const operation of ["findOneAndUpdate", "updateOne", "updateMany", "deleteOne", "deleteMany", "findOneAndDelete"]) {
  auditRecordSchema.pre(operation, () => { throw new Error("Audit records are immutable"); });
}
auditRecordSchema.pre("save", function () { if (!this.isNew) throw new Error("Audit records are immutable"); });

auditRecordSchema.index({ matchResultId: 1, resultRevision: 1 }, { unique: true, partialFilterExpression: { resultRevision: { $type: "number" } } });
export const AuditRecord = mongoose.model("AuditRecord", auditRecordSchema);
