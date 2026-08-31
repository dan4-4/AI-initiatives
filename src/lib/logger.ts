import type { NextRequest } from "next/server";

type LogLevel = "info" | "warn" | "error";

function write(
  level: LogLevel,
  scope: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (scope: string, message: string, meta?: Record<string, unknown>) =>
    write("info", scope, message, meta),
  warn: (scope: string, message: string, meta?: Record<string, unknown>) =>
    write("warn", scope, message, meta),
  error: (scope: string, message: string, meta?: Record<string, unknown>) =>
    write("error", scope, message, meta),
};

/** Замер latency для API-хендлеров */
export function startTimer() {
  const t0 = performance.now();
  return {
    ms: () => Math.round(performance.now() - t0),
  };
}

export function requestId(req?: NextRequest | Request): string {
  if (req && "headers" in req) {
    const fromHeader = req.headers.get("x-request-id");
    if (fromHeader) return fromHeader;
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
