import "dotenv/config";
import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { startMaintenance } from "./services/background.service.js";

const port = Number(process.env.PORT || 3000);
await connectDatabase();
const server = app.listen(port, () => console.log(`ETM API listening on http://localhost:${port}`));
const stopMaintenance = startMaintenance();
async function shutdown(signal) { console.log(`${signal} received`); stopMaintenance(); server.close(async () => { await disconnectDatabase(); process.exit(0); }); }
process.on("SIGINT", () => shutdown("SIGINT")); process.on("SIGTERM", () => shutdown("SIGTERM"));
