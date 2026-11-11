// Tiny JSON-file database. Good for one server and thousands of calls.
// Move to Postgres when you outgrow it.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config.js";

const empty = () => ({ agents: [], calls: [], campaigns: [] });
let db = empty();
let saveTimer = null;

export function load() {
  try {
    db = { ...empty(), ...JSON.parse(fs.readFileSync(config.dataFile, "utf8")) };
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  // Calls that were live when the server stopped can't be resumed.
  for (const c of db.calls) if (["queued", "dialing", "ringing", "in-progress"].includes(c.status)) c.status = "failed";
  return db;
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 300);
}

export function flush() {
  clearTimeout(saveTimer);
  fs.mkdirSync(path.dirname(config.dataFile), { recursive: true });
  const tmp = config.dataFile + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, config.dataFile);
}

export const id = (prefix) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
export const token = () => crypto.randomBytes(18).toString("base64url");

export const agents = {
  all: () => db.agents,
  get: (key) => db.agents.find((a) => a.id === key || a.slug === key),
  add(a) { db.agents.push(a); save(); return a; },
  update(key, patch) {
    const a = agents.get(key);
    if (!a) return null;
    Object.assign(a, patch, { updatedAt: new Date().toISOString() });
    save();
    return a;
  },
  remove(key) {
    const before = db.agents.length;
    db.agents = db.agents.filter((a) => a.id !== key && a.slug !== key);
    save();
    return db.agents.length < before;
  },
};

export const calls = {
  all: () => db.calls,
  get: (callId) => db.calls.find((c) => c.id === callId),
  byProviderId: (pid) => db.calls.find((c) => c.providerCallId === pid),
  add(c) { db.calls.push(c); save(); return c; },
  update(callId, patch) {
    const c = calls.get(callId);
    if (!c) return null;
    Object.assign(c, patch);
    save();
    return c;
  },
  active: () => db.calls.filter((c) => ["dialing", "ringing", "in-progress"].includes(c.status)),
};

export const campaigns = {
  all: () => db.campaigns,
  get: (cid) => db.campaigns.find((c) => c.id === cid),
  add(c) { db.campaigns.push(c); save(); return c; },
  update(cid, patch) {
    const c = campaigns.get(cid);
    if (!c) return null;
    Object.assign(c, patch);
    save();
    return c;
  },
};
