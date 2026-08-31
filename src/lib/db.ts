import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { log } from "./logger";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS passport_history (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      title TEXT NOT NULL,
      input_json TEXT NOT NULL,
      passport_json TEXT NOT NULL,
      similar_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_passport_history_created
      ON passport_history(created_at DESC);
  `);

  log.info("db", "sqlite ready", { path: DB_PATH });
  return db;
}

export function getDbPath(): string {
  return DB_PATH;
}
