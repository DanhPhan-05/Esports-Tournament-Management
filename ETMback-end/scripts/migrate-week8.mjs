import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../src/config/db.js";
import { Match, MatchResult, NotificationTemplate, Team } from "../src/models/index.js";

await connectDatabase();
try {
  // Replace only the superseded unique indexes, without removing documents.
  for (const [model, fields] of [[NotificationTemplate, ["key"]], [Team, ["clubId", "name"]]]) {
    const indexes = await model.collection.listIndexes().toArray().catch((e) => { if (e.codeName === "NamespaceNotFound") return []; throw e; });
    for (const index of indexes) if (index.unique && Object.keys(index.key).join(",") === fields.join(",")) await model.collection.dropIndex(index.name);
    await model.createIndexes();
  }
  await NotificationTemplate.updateMany({ version: { $exists: false } }, { version: 1 });
  await MatchResult.updateMany({ status: { $exists: false } }, { status: "Confirmed", revision: 1 });
  const matches = await Match.find().lean();
  for (const match of matches) {
    if (match.initialTeamAId || match.initialTeamBId) continue;
    const fedA = matches.some((m) => String(m.nextMatchId) === String(match._id) && m.nextMatchSlot === "TeamA");
    const fedB = matches.some((m) => String(m.nextMatchId) === String(match._id) && m.nextMatchSlot === "TeamB");
    await Match.updateOne({ _id: match._id }, { initialTeamAId: fedA ? null : match.teamAId, initialTeamBId: fedB ? null : match.teamBId, section: match.section || "Winners", enabled: true });
  }
  console.log("Week-8 migration complete. Existing accounts must sign in again for session-bound access tokens.");
} finally { await disconnectDatabase(); }
