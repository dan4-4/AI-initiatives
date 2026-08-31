"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AiNecessityVerdict,
  DecisionBandLabel,
  PassportHistorySummary,
} from "@/lib/types";

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const VERDICTS: Array<{ value: "" | AiNecessityVerdict; label: string }> = [
  { value: "", label: "Все вердикты" },
  { value: "да", label: "ИИ: да" },
  { value: "частично", label: "ИИ: частично" },
  { value: "нет", label: "ИИ: нет" },
];

const BANDS: Array<{ value: "" | DecisionBandLabel; label: string }> = [
  { value: "", label: "Все зоны" },
  { value: "Переработать запрос", label: "Переработать" },
  { value: "Требует обоснования", label: "Обоснование" },
  { value: "Через куратора", label: "Куратор" },
  { value: "Разрабатывать", label: "Разрабатывать" },
];

const filterInputClass =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--brand)]";

interface HistoryDrawerProps {
  items: PassportHistorySummary[];
  activeId?: string | null;
  loading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function HistoryDrawer({
  items,
  activeId,
  loading,
  open,
  onOpenChange,
  onOpen,
  onDelete,
}: HistoryDrawerProps) {
  const [query, setQuery] = useState("");
  const [verdict, setVerdict] = useState<"" | AiNecessityVerdict>("");
  const [band, setBand] = useState<"" | DecisionBandLabel>("");
  const [department, setDepartment] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pendingDeleteId) setPendingDeleteId(null);
        else onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pendingDeleteId, onOpenChange]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const d = item.department?.trim();
      if (d) set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (verdict && item.aiVerdict !== verdict) return false;
      if (band && item.decisionBand !== band) return false;
      if (department && item.department !== department) return false;
      if (!q) return true;
      const hay = [
        item.title,
        item.segment,
        item.department,
        item.decisionBand ?? "",
        item.aiVerdict ?? "",
        item.decisionScore !== null ? String(item.decisionScore) : "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, verdict, band, department]);

  const hasFilters = Boolean(query || verdict || band || department);

  return (
    <div className="no-print">
      {open ? (
        <button
          type="button"
          aria-label="Закрыть историю"
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]"
          onClick={() => {
            setPendingDeleteId(null);
            onOpenChange(false);
          }}
        />
      ) : null}

      <aside
        id="history-drawer"
        className={`fixed left-0 top-0 z-50 flex h-full w-[min(100%,360px)] flex-col border-r border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
              История
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Созданные паспорта
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {filtered.length}
              {hasFilters ? ` из ${items.length}` : ""} · поиск и фильтры
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPendingDeleteId(null);
              onOpenChange(false);
            }}
            className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)]"
          >
            Скрыть
          </button>
        </div>

        <div className="space-y-2 border-b border-[var(--line)] px-4 py-3">
          <input
            className={filterInputClass}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию, сегменту…"
            aria-label="Поиск в истории"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className={filterInputClass}
              value={verdict}
              onChange={(e) =>
                setVerdict(e.target.value as "" | AiNecessityVerdict)
              }
              aria-label="Фильтр по вердикту ИИ"
            >
              {VERDICTS.map((v) => (
                <option key={v.label} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
            <select
              className={filterInputClass}
              value={band}
              onChange={(e) =>
                setBand(e.target.value as "" | DecisionBandLabel)
              }
              aria-label="Фильтр по зоне решения"
            >
              {BANDS.map((b) => (
                <option key={b.label} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          {departments.length > 0 ? (
            <select
              className={filterInputClass}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              aria-label="Фильтр по подразделению"
            >
              <option value="">Все подразделения</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          ) : null}
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setVerdict("");
                setBand("");
                setDepartment("");
              }}
              className="text-xs font-semibold text-[var(--brand)]"
            >
              Сбросить фильтры
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Загрузка…</p>
          ) : items.length === 0 ? (
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Пока пусто — после первой оценки паспорт сохранится здесь.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Ничего не найдено — измените поиск или фильтры.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((item) => {
                const active = item.id === activeId;
                const confirming = pendingDeleteId === item.id;
                return (
                  <li
                    key={item.id}
                    className={`rounded-2xl border px-3.5 py-3 transition ${
                      active
                        ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                        : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--brand)]/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onOpen(item.id);
                        setPendingDeleteId(null);
                        onOpenChange(false);
                      }}
                      className="w-full text-left"
                    >
                      <div className="text-[11px] text-[var(--muted)]">
                        {formatDate(item.createdAt)}
                        {item.department ? ` · ${item.department}` : ""}
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--ink)]">
                        {item.title}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                        {item.decisionScore !== null ? (
                          <span className="rounded-full border border-[var(--line)] px-2 py-0.5">
                            {item.decisionScore}/100
                            {item.decisionBand ? ` · ${item.decisionBand}` : ""}
                          </span>
                        ) : null}
                        {item.aiVerdict ? (
                          <span className="rounded-full border border-[var(--line)] px-2 py-0.5">
                            ИИ: {item.aiVerdict}
                          </span>
                        ) : null}
                      </div>
                    </button>
                    <div className="mt-2 flex justify-end">
                      {confirming ? (
                        <div className="flex w-full flex-col gap-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2">
                          <p className="text-[11px] text-[var(--danger)]">
                            Удалить паспорт безвозвратно?
                          </p>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)]"
                            >
                              Отмена
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDelete(item.id);
                                setPendingDeleteId(null);
                              }}
                              className="rounded-lg bg-[var(--danger)] px-2.5 py-1 text-[11px] font-semibold text-white"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(item.id)}
                          className="text-[11px] font-semibold text-[var(--muted)] transition hover:text-[var(--danger)]"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
