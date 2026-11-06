import "dotenv/config";
import { deflateSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { storageConfigured, uploadFile } from "../services/storage.service.js";

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) { crc ^= byte; for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}
try {
  if (!storageConfigured()) throw new Error("Storage is not configured");
  console.log("Cloudinary configuration present. Mode:", process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET ? "signed" : "unsigned preset");
  if (process.argv.includes("--upload")) {
    const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
    const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.from([0,9,97,232,255]))), chunk("IEND", Buffer.alloc(0))]);
    const videoPath = process.argv.includes("--video") ? process.argv[process.argv.indexOf("--video") + 1] : null;
    const mime = videoPath ? ({ ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime" }[path.extname(videoPath).toLowerCase()]) : "image/png";
    const url = await uploadFile({ mimetype: mime, originalname: videoPath ? path.basename(videoPath) : "connection-check.png", buffer: videoPath ? await readFile(videoPath) : png }, { scope: "verification", accountId: "system", label: "connection-check" });
    console.log(videoPath ? "Uploaded video:" : "Uploaded image:", url);
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15000) });
    console.log("Unauthenticated delivery:", response.status, response.headers.get("content-type"));
    if (!response.ok) throw new Error("Public media delivery check failed");
  } else console.log("Pass --upload to upload one generated PNG and verify public delivery; this creates a Cloudinary asset.");
} catch (error) { console.error(error.message); process.exitCode = 1; }
