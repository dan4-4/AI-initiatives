import { NextResponse } from "next/server";
import { listHistory } from "@/lib/history";
import { log, startTimer } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const timer = startTimer();
  try {
    const items = listHistory();
    log.info("history", "list", { count: items.length, latencyMs: timer.ms() });
    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось загрузить историю";
    log.error("history", message, { latencyMs: timer.ms() });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
