import { spawnSync } from "node:child_process";
import path from "node:path";
const result = spawnSync(process.execPath, ["--test", "test/week8.integration.test.js"], { stdio: "inherit", env: { ...process.env, RUN_INTEGRATION: "1", MONGOMS_DOWNLOAD_DIR: process.env.MONGOMS_DOWNLOAD_DIR || path.resolve(".cache/mongodb-binaries") } });
process.exitCode = result.status ?? 1;
