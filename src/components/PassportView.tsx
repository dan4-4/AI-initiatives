"use client";

import { useState } from "react";
import { DecisionScale } from "@/components/DecisionScale";
import { ensureRubSuffix } from "@/lib/costing";
import type { EvaluateResponse, InitiativePassport } from "@/lib/types";

function verdictStyles(verdict: InitiativePassport["aiNecessity"]["verdict"]) {
  if (verdict === "да") {
    return {
      bg: "var(--brand-soft)",
      color: "var(--brand)",
      label: "ИИ необходим",
      tone: "Готово к оценке как ИИ-инициатива",
    };
  }
  if (verdict === "нет") {
    return {
      bg: "var(--danger-soft)",
      color: "var(--danger)",
      label: "ИИ не обязателен",
      tone: "Скорее классическая автоматизация / процесс",
    };
  }
  return {
    bg: "var(--warn-soft)",
    color: "var(--warn)",
    label: "ИИ частично уместен",
    tone: "Нужен гибридный подход или пилот",
  };
}

function hasValue(value: string | undefined | null): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v || v === "—" || v === "-") return false;
  return !/недостаточно|не определ|нет данных|n\/a/i.test(v);
}

function Panel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 md:p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Лёгкий акцент на главной фразе блока */
function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-l-2 border-[var(--brand)]/70 pl-3 text-[17px] font-semibold leading-snug text-[var(--ink)]">
      {children}
    </p>
  );
}

function MetricRow({
  title,
  value,
  emptyHint,
}: {
  title: string;
  value: string;
  emptyHint: string;
}) {
  const ok = hasValue(value);
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${
        ok
          ? "border-[var(--line)] bg-[var(--panel)]"
          : "border-dashed border-[var(--line)] bg-transparent"
      }`}
    >
      <div className="text-xs text-[var(--muted)]">{title}</div>
      {ok ? (
        <div className="mt-1 text-[15px] font-semibold text-[var(--ink)]">
          {value}
        </div>
      ) : (
        <div className="mt-1 text-[13px] text-[var(--muted)]">{emptyHint}</div>
      )}
    </div>
  );
}

interface PassportViewProps {
  data: EvaluateResponse;
  /** Можно ли скопировать ссылку (есть historyId) */
  shareable?: boolean;
  onReset: () => void;
  onEdit: () => void;
  onExportExcel: () => void;
  onCopyLink: () => void;
}

export function PassportView({
  data,
  shareable = false,
  onReset,
  onEdit,
  onExportExcel,
  onCopyLink,
}: PassportViewProps) {
  const { passport, similarCandidates } = data;
  const verdict = verdictStyles(passport.aiNecessity.verdict);
  const decisionScore = passport.decision?.score ?? null;
  const maxScore = Math.max(
    ...similarCandidates.map((c) => c.score),
    0.0001,
  );
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleCopyLink() {
    onCopyLink();
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div className="animate-rise space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
            Вердикт · паспорт
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] md:text-4xl">
            Паспорт инициативы
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--brand)]"
          >
            Изменить заявку
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--brand)]"
            title="Сохранить как PDF через диалог печати"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={onExportExcel}
            className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--brand)]"
          >
            Excel
          </button>
          <button
            type="button"
            disabled={!shareable}
            onClick={() => void handleCopyLink()}
            className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
            title={
              shareable
                ? "Скопировать ссылку на сохранённый паспорт"
                : "Паспорт ещё не сохранён в истории"
            }
          >
            {linkCopied ? "Ссылка скопирована" : "Ссылка"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] px-4 py-2.5 text-sm font-semibold text-[#041018]"
          >
            Новая идея
          </button>
        </div>
      </div>

      <DecisionScale score={decisionScore} />

      <article className="passport-print overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow)]">
        <div
          className="border-b border-[var(--line)] px-6 py-7 md:px-8"
          style={{
            background: `linear-gradient(135deg, ${verdict.bg}, transparent 70%)`,
          }}
        >
          <div className="flex flex-wrap gap-2">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
              style={{ background: verdict.bg, color: verdict.color }}
            >
              {verdict.label}
            </div>
            {passport.decision ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-sm font-semibold text-[var(--ink)]">
                Балл {passport.decision.score} · {passport.decision.band}
              </div>
            ) : null}
          </div>
          <p className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] md:text-3xl">
            {verdict.tone}
          </p>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[var(--muted)]">
            {passport.aiNecessity.rationale}
          </p>
          {passport.decision?.rationale ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
              По шкале решений: {passport.decision.rationale}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 md:p-7">
          <Panel label="Сегмент">
            <Lead>{passport.segment}</Lead>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Куратор: {passport.curator}
            </p>
          </Panel>

          <Panel label="Технология · стек и подход">
            <Lead>{passport.technology.stack}</Lead>
            {passport.technology.summary ? (
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {passport.technology.summary}
              </p>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">
                Краткое описание подхода не сформировано
              </p>
            )}
          </Panel>

          <Panel label="Поставка">
            <Lead>{passport.delivery.form}</Lead>
            {passport.delivery.details ? (
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {passport.delivery.details}
              </p>
            ) : null}
          </Panel>

          <Panel label="Финансы · ожидаемый эффект">
            <p className="mb-3 text-[12px] leading-relaxed text-[var(--muted)]">
              Расчёт по ставке: 20&nbsp;000&nbsp;₽/сутки · 22 р.д./мес. (≈
              440&nbsp;тыс.&nbsp;₽/мес. на 1 чел.)
            </p>
            <div className="grid gap-2">
              <MetricRow
                title="Сокращение трудозатрат"
                value={passport.financialEffect.laborCostReductionRub}
                emptyHint="Нужны ФОТ / часы — пришлите для расчёта"
              />
              <MetricRow
                title="Рост дохода"
                value={passport.financialEffect.revenueGrowthRub}
                emptyHint="Если выручки нет — укажите 0 или цель в заявке"
              />
            </div>
          </Panel>

          <Panel label="Бюджет · стоимость реализации">
            {passport.projectCost ? (
              <div className="mb-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 py-3">
                <div className="text-xs text-[var(--muted)]">Коридор сложности</div>
                <Lead>
                  {passport.projectCost.tierLabel}
                  {passport.projectCost.estimateRub
                    ? ` · ${ensureRubSuffix(passport.projectCost.estimateRub)}`
                    : ""}
                </Lead>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Диапазон: {passport.projectCost.rangeRub}
                </p>
                {passport.projectCost.rationale ? (
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                    {passport.projectCost.rationale}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <MetricRow
                title="Пилот"
                value={ensureRubSuffix(passport.budget.pilot)}
                emptyHint="Оценка появится после уточнения объёма"
              />
              <MetricRow
                title="Пром"
                value={ensureRubSuffix(passport.budget.production)}
                emptyHint="Оценка после пилота / ТЗ"
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
              Коридоры: Нейрошлюз 0–300 тыс. ₽ · простое приложение 300 тыс.–1 млн
              ₽ · полная разработка 1–5 млн ₽
            </p>
          </Panel>

          <Panel label="Комментарий · разумность идеи">
            <p className="text-[15px] leading-relaxed text-[var(--ink)]/90">
              {passport.comments.reasonableness ||
                "Комментарий не сформирован"}
            </p>
          </Panel>
        </div>

        <div className="space-y-6 border-t border-[var(--line)] px-5 py-6 md:px-7">
          <section>
            <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Вопросы к заказчику
            </h3>
            {passport.comments.questions.length > 0 ? (
              <ol className="mt-3 space-y-2">
                {passport.comments.questions.map((q, i) => (
                  <li
                    key={q}
                    className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-[15px]"
                  >
                    <span className="tabular-nums text-[var(--muted)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-[var(--muted)]">Уточняющих вопросов нет</p>
            )}
          </section>

          <section>
            <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Похожие инициативы
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Отбор ИИ из кандидатов: с пояснением, почему похожи, и ссылкой на
              сервис
            </p>
            {passport.comments.similarLinks.length > 0 ? (
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {passport.comments.similarLinks.map((link) => (
                  <li
                    key={`${link.title}-${link.url}`}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-4"
                  >
                    <div className="font-medium">{link.title}</div>
                    {link.reason ? (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {link.reason}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                      {link.department ? <span>{link.department}</span> : null}
                      {link.technologies ? (
                        <span>{link.technologies}</span>
                      ) : null}
                      {link.url ? (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[var(--brand)] underline-offset-2 hover:underline"
                        >
                          Открыть сервис
                        </a>
                      ) : (
                        <span>Ссылка отсутствует</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[var(--muted)]">
                Похожие инициативы в паспорте не указаны
              </p>
            )}
          </section>

          {similarCandidates.length > 0 ? (
            <section>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                    Кандидаты из реестра
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Автопоиск по Excel: все ближайшие совпадения по тексту, с
                    оценкой близости
                  </p>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  top {similarCandidates.length}
                </p>
              </div>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {similarCandidates.map((c, index) => {
                  const pct = Math.round((c.score / maxScore) * 100);
                  const accent =
                    index === 0
                      ? "var(--brand)"
                      : index === 1
                        ? "var(--brand-2)"
                        : "var(--brand-3)";
                  return (
                    <li
                      key={c.id}
                      className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]"
                    >
                      <div
                        className="h-1 w-full"
                        style={{
                          background: `linear-gradient(90deg, ${accent}, transparent)`,
                        }}
                      />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                              #{String(index + 1).padStart(2, "0")}
                              {c.department ? ` · ${c.department}` : ""}
                            </div>
                            <div className="mt-1 text-[15px] font-medium leading-snug text-[var(--ink)]">
                              {c.title}
                            </div>
                          </div>
                          <div
                            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
                            style={{
                              background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                              color: accent,
                            }}
                          >
                            {pct}%
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(pct, 6)}%`,
                              background: accent,
                            }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {c.technologies ? (
                            <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--muted)]">
                              {c.technologies}
                            </span>
                          ) : null}
                          {c.serviceUrl && c.serviceUrl !== "-" ? (
                            <a
                              href={c.serviceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand)] transition hover:border-[var(--brand)]"
                            >
                              Открыть
                            </a>
                          ) : (
                            <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--muted)]">
                              без ссылки
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </div>
  );
}
