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
  )
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
