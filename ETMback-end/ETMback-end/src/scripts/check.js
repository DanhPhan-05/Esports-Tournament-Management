import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
  return nested.flat();
}
const sourceRoot = path.resolve("src");
const executableScripts = ["server.js", "check.js"];
const targets = (await files(sourceRoot)).filter((file) => file.endsWith(".js") && !executableScripts.some((name) => file.endsWith(name)));
for (const file of targets) await import(pathToFileURL(file));
console.log(`Imported ${targets.length} source files successfully.`);
