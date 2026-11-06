import mongoose from "mongoose";

const banSchema = new mongoose.Schema({
  targetType: { type: String, enum: ["Account", "Club", "Individual"], required: true, index: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", default: null },
  citizenIdHash: { type: String, default: null, index: true },
  scope: { type: String, enum: ["System", "Competition"], default: "System" },
  reason: { type: String, required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, default: null },
  status: { type: String, enum: ["Active", "Revoked", "Expired"], default: "Active", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  revokedAt: Date,
}, { timestamps: true });

banSchema.pre("validate", function () {
  const targets = { Account: Boolean(this.accountId), Club: Boolean(this.clubId), Individual: Boolean(this.citizenIdHash) };
  if (!targets[this.targetType] || Object.values(targets).filter(Boolean).length !== 1) this.invalidate("targetType", "Exactly one matching ban target is required");
  if (this.endsAt && this.endsAt <= this.startsAt) this.invalidate("endsAt", "Ban end must be after start");
});
export const Ban = mongoose.model("Ban", banSchema);
