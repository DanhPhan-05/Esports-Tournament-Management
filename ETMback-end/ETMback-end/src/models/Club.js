import mongoose from "mongoose";

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  shortName: { type: String, required: true, uppercase: true, trim: true, maxlength: 12 },
  logoUrl: String,
  description: String,
  country: String,
  region: String,
  isVerified: { type: Boolean, default: false },
  contactEmail: { type: String, required: true, lowercase: true, trim: true },
  contactPhone: String,
  managerAccountIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  status: { type: String, enum: ["Active", "Inactive", "Suspended"], default: "Active", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export const Club = mongoose.model("Club", clubSchema);
