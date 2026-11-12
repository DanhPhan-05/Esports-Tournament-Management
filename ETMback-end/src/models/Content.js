import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 250 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  type: { type: String, enum: ["News", "Announcement", "Update"], default: "News" },
  summary: { type: String, maxlength: 1000 },
  body: { type: String, required: true, maxlength: 100000 },
  imageUrl: String,
  videoUrl: String,
  status: { type: String, enum: ["Draft", "Published", "Archived"], default: "Draft", index: true },
  publishedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
export const Content = mongoose.model("Content", schema);
