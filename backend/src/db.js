// Single-document store: one JSON blob, one row, last-write-wins.
// Matches the client's mental model (README §3) — the backend's only job is
// to store, serve, and stream that one blob.
import DatabaseConstructor from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH || "./data/kim.sqlite3";
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseConstructor(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    doc TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS push_subs (
    endpoint   TEXT PRIMARY KEY,
    sub        TEXT NOT NULL,   -- full PushSubscription JSON
    name       TEXT,            -- player name (to skip the actor on send)
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS push_kv (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL
  );
`);

const selectStmt = db.prepare("SELECT doc FROM state WHERE id = 1");
const upsertStmt = db.prepare(`
  INSERT INTO state (id, doc, updated_at) VALUES (1, ?, ?)
  ON CONFLICT (id) DO UPDATE SET doc = excluded.doc, updated_at = excluded.updated_at
`);

export function getState() {
  const row = selectStmt.get();
  return row ? JSON.parse(row.doc) : null;
}

export function setState(doc) {
  upsertStmt.run(JSON.stringify(doc), Date.now());
  return doc;
}

/* ---- push subscriptions ---- */
const subUpsertStmt = db.prepare(`
  INSERT INTO push_subs (endpoint, sub, name, created_at) VALUES (?, ?, ?, ?)
  ON CONFLICT (endpoint) DO UPDATE SET sub = excluded.sub, name = excluded.name
`);
const subAllStmt = db.prepare("SELECT sub, name FROM push_subs");
const subDelStmt = db.prepare("DELETE FROM push_subs WHERE endpoint = ?");
const subCountStmt = db.prepare("SELECT COUNT(*) AS n FROM push_subs");

export function addSub(endpoint, subJson, name) {
  subUpsertStmt.run(endpoint, subJson, name, Date.now());
}
export function allSubs() {
  return subAllStmt.all().map((r) => ({ sub: JSON.parse(r.sub), name: r.name }));
}
export function removeSub(endpoint) {
  subDelStmt.run(endpoint);
}
export function countSubs() {
  return subCountStmt.get().n;
}

/* ---- tiny key/value (push bookkeeping, e.g. last-notified hint count) ---- */
const kvGetStmt = db.prepare("SELECT v FROM push_kv WHERE k = ?");
const kvSetStmt = db.prepare(`
  INSERT INTO push_kv (k, v) VALUES (?, ?)
  ON CONFLICT (k) DO UPDATE SET v = excluded.v
`);
export function getKv(k) {
  const row = kvGetStmt.get(k);
  return row ? row.v : null;
}
export function setKv(k, v) {
  kvSetStmt.run(k, String(v));
}
