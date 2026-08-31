"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptyForm,
  InitiativeForm,
  type FormState,
} from "@/components/InitiativeForm";
import { PassportView } from "@/components/PassportView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DecisionScale } from "@/components/DecisionScale";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { RegistryDrawer } from "@/components/RegistryDrawer";
import { LeftSideRail } from "@/components/LeftSideRail";
import type { RegistryInfo } from "@/components/RegistryUpload";
import {
  downloadPassportExcel,
  passportShareUrl,
} from "@/lib/exportPassport";
import type {
  EvaluateResponse,
  PassportHistoryEntry,
  PassportHistorySummary,
} from "@/lib/types";

const FLOW = [
  {
    n: "01",
    title: "Заявка",
    text: "Описываете проблему, процесс и ожидаемый эффект",
  },
  {
    n: "02",
    title: "Проверки",
    text: "Ищем похожие инициативы в реестре и оцениваем необходимость ИИ",
  },
  {
    n: "03",
    title: "Паспорт",
    text: "Получаете one-page с технологией, бюджетом и вопросами",
  },
];

function historyIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("h");
}

function setHistoryInUrl(id: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("h", id);
  else url.searchParams.delete("h");
  window.history.replaceState({}, "", url.toString());
}

export default function HomePage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [departments, setDepartments] = useState<string[]>([]);
  const [registryInfo, setRegistryInfo] = useState<RegistryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [history, setHistory] = useState<PassportHistorySummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [registryOpen, setRegistryOpen] = useState(false);
  const [editBackup, setEditBackup] = useState<{
    result: EvaluateResponse;
    form: FormState;
  } | null>(null);

  const applyRegistryMeta = useCallback((data: RegistryInfo & { error?: string }) => {
    setRegistryInfo({
      count: data.count,
      source: data.source,
      fileName: data.fileName,
      updatedAt: data.updatedAt,
      departments: data.departments,
    });
    if (data.departments) setDepartments(data.departments);
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить историю");
      setHistory(data.items ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openHistory = useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/history/${id}`);
      const data = (await res.json()) as PassportHistoryEntry & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Не удалось открыть запись");
      setForm({ ...emptyForm(), ...data.input });
      setResult({
        passport: data.passport,
        similarCandidates: data.similarCandidates,
        historyId: data.id,
      });
      setActiveHistoryId(data.id);
      setEditing(false);
      setEditBackup(null);
      setHistoryInUrl(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка открытия истории");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/registry");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Не удалось загрузить реестр");
        if (!cancelled) applyRegistryMeta(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Ошибка загрузки справочников реестра",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyRegistryMeta]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    const id = historyIdFromUrl();
    if (id) void openHistory(id);
  }, [openHistory]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка оценки инициативы");
      }
      const evaluated = data as EvaluateResponse;
      setResult(evaluated);
      setActiveHistoryId(evaluated.historyId ?? null);
      setEditing(false);
      setEditBackup(null);
      setHistoryInUrl(evaluated.historyId ?? null);
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function deleteHistory(id: string) {
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось удалить");
      if (activeHistoryId === id) {
        setResult(null);
        setActiveHistoryId(null);
        setEditing(false);
        setEditBackup(null);
        setHistoryInUrl(null);
      }
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  }

  function startNewIdea() {
    setResult(null);
    setError(null);
    setActiveHistoryId(null);
    setForm(emptyForm());
    setEditing(false);
    setEditBackup(null);
    setHistoryInUrl(null);
  }

  function startEdit() {
    if (!result) return;
    setEditBackup({ result, form });
    setResult(null);
    setEditing(true);
  }

  function cancelEdit() {
    if (editBackup) {
      setResult(editBackup.result);
      setForm(editBackup.form);
      setActiveHistoryId(editBackup.result.historyId ?? activeHistoryId);
      setHistoryInUrl(editBackup.result.historyId ?? activeHistoryId);
    }
    setEditing(false);
    setEditBackup(null);
  }

  async function copyShareLink() {
    const id = result?.historyId ?? activeHistoryId;
    if (!id) {
      setError("Сначала сохраните паспорт в истории");
      return;
    }
    const url = passportShareUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      setHistoryInUrl(id);
    } catch {
      setError("Не удалось скопировать ссылку");
    }
  }

  const showForm = !result;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <LeftSideRail
        historyCount={history.length}
        registryCount={registryInfo?.count ?? "—"}
        historyOpen={historyOpen}
        registryOpen={registryOpen}
        onOpenHistory={() => {
          setRegistryOpen(false);
          setHistoryOpen(true);
        }}
        onOpenRegistry={() => {
          setHistoryOpen(false);
          setRegistryOpen(true);
        }}
      />
      <HistoryDrawer
        items={history}
        activeId={activeHistoryId}
        loading={historyLoading}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onOpen={openHistory}
        onDelete={deleteHistory}
      />
      <RegistryDrawer
        info={registryInfo}
        open={registryOpen}
        onOpenChange={setRegistryOpen}
        onUpdated={(info) => {
          applyRegistryMeta(info);
          setError(null);
        }}
        onError={(message) => {
          if (message) setError(message);
          else setError(null);
        }}
      />

      <nav className="no-print mb-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] font-[family-name:var(--font-display)] text-sm font-bold text-[#041018]">
            ИИ
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">
              Оценка инициатив
            </div>
            <div className="text-xs text-[var(--muted)]">
              реестр · анализ · паспорт · история
            </div>
          </div>
        </div>
        <ThemeToggle />
      </nav>

      {showForm && !editing ? (
        <>
          <header className="animate-rise mb-10 max-w-3xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">
              Принятие решений
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.05] text-[var(--ink)] md:text-6xl">
              От идеи до паспорта инициативы
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] md:text-lg">
              Заполните карточку — сервис сверит идею с реестром, оценит
              необходимость ИИ и соберёт одностраничный паспорт для обсуждения.
            </p>
            {registryInfo ? (
              <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-[var(--brand)] animate-pulse-soft" />
                В реестре{" "}
                <strong className="text-[var(--ink)]">{registryInfo.count}</strong>{" "}
                инициатив
              </div>
            ) : null}
          </header>
          <section className="animate-rise-delay-1 no-print mb-8 grid gap-3 md:grid-cols-3">
            {FLOW.map((item, index) => (
              <div
                key={item.n}
                className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5"
                style={{
                  boxShadow:
                    index === 0
                      ? "inset 0 0 0 1px color-mix(in srgb, var(--brand) 35%, transparent)"
                      : index === 1
                        ? "inset 0 0 0 1px color-mix(in srgb, var(--brand-2) 35%, transparent)"
                        : "inset 0 0 0 1px color-mix(in srgb, var(--brand-3) 30%, transparent)",
                }}
              >
                <div
                  className="font-[family-name:var(--font-display)] text-sm"
                  style={{
                    color:
                      index === 0
                        ? "var(--brand)"
                        : index === 1
                          ? "var(--brand-2)"
                          : "var(--brand-3)",
                  }}
                >
                  {item.n}
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--ink)]">
                  {item.title}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {item.text}
                </p>
              </div>
            ))}
          </section>
        </>
      ) : null}

      {error ? (
        <div className="no-print mb-6 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {result ? (
        <PassportView
          data={result}
          shareable={Boolean(result.historyId ?? activeHistoryId)}
          onReset={startNewIdea}
          onEdit={startEdit}
          onExportExcel={() => downloadPassportExcel(result, form)}
          onCopyLink={() => void copyShareLink()}
        />
      ) : (
        <div className="animate-rise-delay-2 grid items-start gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)] md:p-8">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {editing ? "Редактирование" : "Мастер заявки"}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
                {editing ? "Изменение заявки" : "Карточка инициативы"}
              </h2>
              {editing ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Правьте поля и нажмите «Пересчитать паспорт» — новая оценка
                  сохранится в истории.
                </p>
              ) : null}
            </div>
            <InitiativeForm
              value={form}
              departments={departments}
              loading={loading}
              recalculate={editing}
              onChange={setForm}
              onSubmit={handleSubmit}
              onCancelEdit={editing ? cancelEdit : undefined}
            />
          </section>

          <aside className="no-print space-y-4">
            <DecisionScale compact />
            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
                Что получите
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--muted)]">
                <li className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
                  Балл 0–100 и рекомендация по шкале решений
                </li>
                <li className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
                  Вердикт: нужен ли ИИ для задачи
                </li>
                <li className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
                  Паспорт сохранится в истории слева
                </li>
              </ul>
            </div>
            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
                Ставка
              </p>
              <p className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
                <strong className="text-[var(--ink)]">20&nbsp;000&nbsp;₽/сутки</strong>
                , 22 р.д./мес. (≈ 440 тыс. ₽/мес. на 1 чел.)
              </p>
            </div>
            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
                Оценка стоимости
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
                <li className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
                  Нейрошлюз: 0–300 тыс. ₽
                </li>
                <li className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
                  Простое приложение: 300 тыс.–1 млн ₽
                </li>
                <li className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
                  Полная разработка: 1–5 млн ₽
                </li>
              </ul>
            </div>
            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Совет
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Чем конкретнее метрика и масштаб, тем выше балл — размытые
                формулировки обычно уходят в зону «переработать / обосновать».
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
