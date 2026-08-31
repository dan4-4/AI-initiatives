"use client";

import {
  DECISION_BANDS,
  getDecisionBand,
  type DecisionBand,
} from "@/lib/decisionScale";

interface DecisionScaleProps {
  /** Если задан — активная шкала с маркером балла */
  score?: number | null;
  compact?: boolean;
  title?: string;
}

const BAND_WIDTH: Record<string, string> = {
  rework: "31%",
  justify: "25%",
  provider: "20%",
  develop: "24%",
};

export function DecisionScale({
  score = null,
  compact = false,
  title = "Шкала решений",
}: DecisionScaleProps) {
  const active: DecisionBand | null =
    typeof score === "number" ? getDecisionBand(score) : null;
  const marker =
    typeof score === "number" ? Math.max(0, Math.min(100, score)) : null;

  return (
    <section
      className={`rounded-[28px] border border-[var(--line)] bg-[var(--card)] ${
        compact ? "p-5" : "p-6"
      }`}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
          {title}
        </p>
        {active ? (
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            {marker}
            <span className="text-base text-[var(--muted)]"> / 100</span>
            <span className="mx-2 text-[var(--muted)]">·</span>
            <span style={{ color: active.colorVar }}>{active.label}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Как читать итоговый балл после оценки
          </p>
        )}
      </div>

      <div className="relative mt-5">
        <div className="flex h-3 overflow-hidden rounded-full border border-[var(--line)]">
          {DECISION_BANDS.map((band) => (
            <div
              key={band.id}
              className="h-full transition"
              style={{
                width: BAND_WIDTH[band.id],
                background:
                  active?.id === band.id
                    ? `linear-gradient(90deg, ${band.colorVar}, color-mix(in srgb, ${band.colorVar} 50%, transparent))`
                    : `color-mix(in srgb, ${band.colorVar} 38%, transparent)`,
                opacity: active && active.id !== band.id ? 0.4 : 1,
              }}
            />
          ))}
        </div>

        {marker !== null ? (
          <div
            className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--card)] shadow-[0_0_0_3px_var(--brand-soft)]"
            style={{
              left: `${marker}%`,
              background: active?.colorVar ?? "var(--brand)",
            }}
          />
        ) : null}
      </div>

      <ul className={`mt-5 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
        {DECISION_BANDS.map((band) => {
          const isActive = active?.id === band.id;
          return (
            <li
              key={band.id}
              className={`rounded-2xl border px-3.5 py-3 transition ${
                isActive
                  ? "shadow-[0_0_0_1px_currentColor]"
                  : "border-[var(--line)] bg-[var(--card)]"
              }`}
              style={
                isActive
                  ? {
                      background: band.softVar,
                      borderColor: band.colorVar,
                      color: band.colorVar,
                    }
                  : undefined
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: band.colorVar }}
                >
                  {band.min}–{band.max}
                </span>
                {isActive ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: band.softVar, color: band.colorVar }}
                  >
                    сейчас
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--ink)]">
                {band.label}
              </div>
              {!compact ? (
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                  {band.hint}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
