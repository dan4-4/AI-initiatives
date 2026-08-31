import { NextResponse } from "next/server";
import { getDb, getDbPath } from "@/lib/db";
import { historyCount } from "@/lib/history";
import { log, startTimer } from "@/lib/logger";
import { getRegistryMeta, resolveRegistryPath } from "@/lib/registry";
import fs from "fs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const timer = startTimer();
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    getDb();
    const count = historyCount();
    checks.database = { ok: true, detail: `sqlite · ${count} паспортов` };
  } catch (error) {
    checks.database = {
      ok: false,
      detail: error instanceof Error ? error.message : "db error",
    };
  }

  try {
    const meta = getRegistryMeta();
    checks.registry = {
      ok: true,
      detail: `${meta.count} · ${meta.source} · ${meta.fileName}`,
    };
  } catch (error) {
    const pathHint = resolveRegistryPath();
    checks.registry = {
      ok: false,
      detail: `${error instanceof Error ? error.message : "registry error"} (${pathHint})`,
    };
  }

  checks.aiKey = {
    ok: Boolean(process.env.AI_API_KEY?.trim()),
    detail: process.env.AI_API_KEY?.trim()
      ? "AI_API_KEY задан"
      : "AI_API_KEY отсутствует",
  };

  const healthy = Object.values(checks).every((c) => c.ok);
  const body = {
    status: healthy ? "ok" : "degraded",
    latencyMs: timer.ms(),
    checks,
    dbPath: getDbPath(),
    registryPath: fs.existsSync(resolveRegistryPath())
      ? resolveRegistryPath()
      : null,
    time: new Date().toISOString(),
  };

  log.info("health", body.status, { latencyMs: body.latencyMs, healthy });
  return NextResponse.json(body, { status: healthy ? 200 : 503 });
}
