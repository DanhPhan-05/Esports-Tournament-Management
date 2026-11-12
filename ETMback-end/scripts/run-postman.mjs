import fs from "node:fs/promises";
import assert from "node:assert/strict";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Small runner for the checked-in ETM collection, with the same pm.test and
// variable-extraction scripts that Postman executes. Uses Node's native fetch.
export async function runCollection(collection, environment = {}) {
  const variables = new Map((collection.variable || []).map((v) => [v.key, v.value]));
  for (const [key, value] of Object.entries(environment)) variables.set(key, String(value));
  const substitute = (text) => String(text).replace(/\{\{(\w+)\}\}/g, (_all, key) => String(variables.get(key) ?? ""));
  const cookies = new Map(); let assertions = 0, requests = 0;
  const scripts = (events, listen, pm) => { for (const event of events || []) if (event.listen === listen) vm.runInNewContext(event.script.exec.join("\n"), { pm, Date, JSON }, { timeout: 1000 }); };
  for (const item of collection.item) {
    if (!item.request) throw new Error("ETM runner expects a flat request collection");
    const pm = {
      collectionVariables: { get: (key) => variables.get(key), set: (key, value) => variables.set(key, String(value)) },
      test: (name, callback) => { try { callback(); assertions++; } catch (error) { throw new Error(`${item.name}: ${name}: ${error.message}`, { cause: error }); } },
      expect: (actual) => ({ to: { eql: (expected) => assert.deepEqual(actual, expected), equal: (expected) => assert.equal(actual, expected) } }),
    };
    scripts(collection.event, "prerequest", pm); scripts(item.event, "prerequest", pm);
    const request = item.request;
    const headers = Object.fromEntries((request.header || []).map((h) => [h.key, substitute(h.value)]));
    const auth = request.auth || collection.auth;
    if (auth?.type === "bearer") headers.Authorization = `Bearer ${substitute(auth.bearer.find((v) => v.key === "token").value)}`;
    headers.Cookie = [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
    const response = await fetch(substitute(request.url), { method: request.method, headers, ...(request.body ? { body: substitute(request.body.raw) } : {}), signal: AbortSignal.timeout(30000) });
    for (const cookie of response.headers.getSetCookie()) { const [pair] = cookie.split(";"); const at = pair.indexOf("="); cookies.set(pair.slice(0, at), pair.slice(at + 1)); }
    const text = await response.text(); let json;
    try { json = text ? JSON.parse(text) : null; } catch { throw new Error(`${item.name}: API did not return JSON`); }
    pm.response = { code: response.status, json: () => json };
    scripts(collection.event, "test", pm); scripts(item.event, "test", pm); requests++;
  }
  return { requests, assertions };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const collection = JSON.parse(await fs.readFile(process.argv[2] || "postman/ETM_Weeks_1_8.postman_collection.json", "utf8"));
  const environment = JSON.parse(await fs.readFile(process.argv[3], "utf8"));
  console.log(await runCollection(collection, environment));
}
