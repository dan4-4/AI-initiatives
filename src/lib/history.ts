import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getDb } from "./db";
import { log } from "./logger";
import type {
  EvaluateResponse,
  InitiativeInput,
  InitiativePassport,
  PassportHistoryEntry,
  PassportHistorySummary,
} from "./types";

const MAX_ENTRIES = 200;
const LEGACY_JSON = path.join(process.cwd(), "data", "passport-history.json");

let migrated = false;

function makeTitle(input: InitiativeInput, passport: InitiativePassport): string {
  const fromProblem = input.problem.trim().replace(/\s+/g, " ");
  if (fromProblem) {
    return fromProblem.length > 80
      ? `${fromProblem.slice(0, 77)}…`
      : fromProblem;
  }
  return passport.segment || "Без названия";
}

function rowToEntry(row: {
  id: string;
  created_at: string;
  title: string;
  input_json: string;
  passport_json: string;
  similar_json: string;
}): PassportHistoryEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    input: JSON.parse(row.input_json) as InitiativeInput,
    passport: JSON.parse(row.passport_json) as InitiativePassport,
    similarCandidates: JSON.parse(
      row.similar_json,
    ) as EvaluateResponse["similarCandidates"],
  };
}

/** Однократный импорт старого passport-history.json в SQLite */
function migrateLegacyJsonIfNeeded(): void {
  if (migrated) return;
  migrated = true;

  const database = getDb();
  const count = database
    .prepare("SELECT COUNT(*) AS c FROM passport_history")
    .get() as { c: number };

  if (count.c > 0 || !fs.existsSync(LEGACY_JSON)) return;

  try {
    const raw = fs.readFileSync(LEGACY_JSON, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    const insert = database.prepare(`
      INSERT OR IGNORE INTO passport_history
        (id, created_at, title, input_json, passport_json, similar_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    database.exec("BEGIN");
    for (const item of parsed as PassportHistoryEntry[]) {
      if (!item?.id) continue;
      insert.run(
        item.id,
        item.createdAt,
        item.title,
        JSON.stringify(item.input ?? {}),
        JSON.stringify(item.passport ?? {}),
        JSON.stringify(item.similarCandidates ?? []),
      );
    }
    database.exec("COMMIT");

    const bak = `${LEGACY_JSON}.migrated`;
    fs.renameSync(LEGACY_JSON, bak);
    log.info("history", "migrated legacy JSON to sqlite", {
      count: parsed.length,
      backup: bak,
    });
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      /* ignore */
    }
    log.error("history", "legacy migration failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function listHistory(): PassportHistorySummary[] {
  migrateLegacyJsonIfNeeded();
  const rows = getDb()
    .prepare(
      `SELECT id, created_at, title, input_json, passport_json
       FROM passport_history
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(MAX_ENTRIES) as Array<{
    id: string;
    created_at: string;
    title: string;
    input_json: string;
    passport_json: string;
  }>;

  return rows.map((row) => {
    const input = JSON.parse(row.input_json) as InitiativeInput;
    const passport = JSON.parse(row.passport_json) as InitiativePassport;
    return {
      id: row.id,
      createdAt: row.created_at,
      title: row.title,
      segment: passport.segment,
      decisionScore: passport.decision?.score ?? null,
      decisionBand: passport.decision?.band ?? null,
      aiVerdict: passport.aiNecessity?.verdict ?? null,
      department: input.department ?? "",
    };
  });
}

export function getHistoryEntry(id: string): PassportHistoryEntry | null {
  migrateLegacyJsonIfNeeded();
  const row = getDb()
    .prepare(
      `SELECT id, created_at, title, input_json, passport_json, similar_json
       FROM passport_history WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        created_at: string;
        title: string;
        input_json: string;
        passport_json: string;
        similar_json: string;
      }
    | undefined;

  return row ? rowToEntry(row) : null;
}

export function savePassportHistory(
  input: InitiativeInput,
  result: EvaluateResponse,
): PassportHistoryEntry {
  migrateLegacyJsonIfNeeded();
  const entry: PassportHistoryEntry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    title: makeTitle(input, result.passport),
    input,
    passport: result.passport,
    similarCandidates: result.similarCandidates,
  };

  const database = getDb();
  database
    .prepare(
      `INSERT INTO passport_history
        (id, created_at, title, input_json, passport_json, similar_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      entry.id,
      entry.createdAt,
      entry.title,
      JSON.stringify(entry.input),
      JSON.stringify(entry.passport),
      JSON.stringify(entry.similarCandidates),
    );

  // trim to MAX_ENTRIES
  database
    .prepare(
      `DELETE FROM passport_history
       WHERE id NOT IN (
         SELECT id FROM passport_history
         ORDER BY created_at DESC
         LIMIT ?
       )`,
    )
    .run(MAX_ENTRIES);

  return entry;
}

export function deleteHistoryEntry(id: string): boolean {
  migrateLegacyJsonIfNeeded();
  const result = getDb()
    .prepare("DELETE FROM passport_history WHERE id = ?")
    .run(id);
  return Number(result.changes) > 0;
}

export function historyCount(): number {
  migrateLegacyJsonIfNeeded();
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM passport_history")
    .get() as { c: number };
  return row.c;
}
