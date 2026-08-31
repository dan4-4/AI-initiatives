import { NextResponse } from "next/server";
import { deleteHistoryEntry, getHistoryEntry } from "@/lib/history";
import { log, startTimer } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const timer = startTimer();
  try {
    const { id } = await context.params;
    const entry = getHistoryEntry(id);
    if (!entry) {
      return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
    }
    log.info("history", "get", { id, latencyMs: timer.ms() });
    return NextResponse.json(entry);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось загрузить запись";
    log.error("history", message, { latencyMs: timer.ms() });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const timer = startTimer();
  try {
    const { id } = await context.params;
    const ok = deleteHistoryEntry(id);
    if (!ok) {
      return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
    }
    log.info("history", "delete", { id, latencyMs: timer.ms() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось удалить запись";
    log.error("history", message, { latencyMs: timer.ms() });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
