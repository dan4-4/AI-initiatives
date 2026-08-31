"use client";

import { useState } from "react";
import type { DataReadiness, FundingSource, InitiativeInput } from "@/lib/types";

const DATA_READINESS: { value: DataReadiness; label: string; hint: string }[] = [
  { value: "есть", label: "Есть", hint: "Данные готовы к обучению" },
  { value: "частично", label: "Частично", hint: "Нужна доработка" },
  { value: "нет", label: "Нет", hint: "Данных пока нет" },
];

const FUNDING: { value: FundingSource; label: string }[] = [
  { value: "OPEX подразделения", label: "OPEX" },
  { value: "CAPEX / инвестиционный проект", label: "CAPEX" },
  { value: "бюджет ЦК ИИ", label: "Бюджет ЦК ИИ" },
  { value: "совместное финансирование", label: "Совместно" },
  { value: "другое", label: "Другое" },
];

const STEPS = [
  { id: 0, title: "Суть", subtitle: "Проблема и процесс" },
  { id: 1, title: "Эффект", subtitle: "Метрики и масштаб" },
  { id: 2, title: "Реализация", subtitle: "Данные и бюджет" },
] as const;

export type FormState = InitiativeInput;

export const emptyForm = (): FormState => ({
  problem: "",
  process: "",
  metricGoal: "",
  peopleImpact: "",
  savingsPercent: "",
  scalability: "",
  revenueGrowthPercent: "",
  integrations: "",
  dataReadiness: "частично",
  fundingSource: "OPEX подразделения",
  fundingSourceOther: "",
  department: "",
});

interface InitiativeFormProps {
  value: FormState;
  departments: string[];
  loading: boolean;
  /** Режим пересчёта после «Изменить заявку» */
  recalculate?: boolean;
  onChange: (next: FormState) => void;
  onSubmit: () => void;
  onCancelEdit?: () => void;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </span>
      {hint ? (
        <span className="-mt-1 text-xs text-[var(--muted)]/80">{hint}</span>
      ) : null}
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-[var(--line)] bg-[var(--input)] px-4 py-3 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--brand)] focus:shadow-[0_0_0_4px_var(--brand-soft)]";

const textareaClass = `${inputClass} min-h-[110px] resize-y`;

function Chip({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-[var(--brand)] bg-[var(--brand-soft)] shadow-[0_0_0_1px_var(--brand)]"
          : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--brand)]/50"
      }`}
    >
      <div className="text-sm font-semibold text-[var(--ink)]">{label}</div>
      {hint ? <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div> : null}
    </button>
  );
}

export function InitiativeForm({
  value,
  departments,
  loading,
  recalculate = false,
  onChange,
  onSubmit,
  onCancelEdit,
}: InitiativeFormProps) {
  const [step, setStep] = useState(0);

  const set =
    <K extends keyof FormState>(key: K) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      onChange({ ...value, [key]: event.target.value as FormState[K] });
    };

  function canGoNext(): boolean {
    if (step === 0) {
      return Boolean(value.problem.trim() && value.process.trim());
    }
    if (step === 1) {
      return Boolean(
        value.metricGoal.trim() &&
          value.peopleImpact.trim() &&
          value.savingsPercent.trim() &&
          value.revenueGrowthPercent.trim() &&
          value.scalability.trim(),
      );
    }
    return true;
  }

  return (
    <form
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (step < STEPS.length - 1) {
          if (canGoNext()) setStep((s) => s + 1);
          return;
        }
        onSubmit();
      }}
    >
      <div className="grid gap-2 md:grid-cols-3">
        {STEPS.map((item) => {
          const active = item.id === step;
          const done = item.id < step;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                  : done
                    ? "border-[var(--line)] bg-[var(--panel)]"
                    : "border-[var(--line)]/70 bg-transparent opacity-70"
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Шаг {item.id + 1}
              </div>
              <div className="mt-1 font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
                {item.title}
              </div>
              <div className="text-xs text-[var(--muted)]">{item.subtitle}</div>
            </button>
          );
        })}
      </div>

      {step === 0 ? (
        <div className="animate-rise space-y-5">
          <Field label="Проблема" hint="Что болит сейчас и почему это важно">
            <textarea
              className={textareaClass}
              value={value.problem}
              onChange={set("problem")}
              required
              placeholder="Опишите проблему..."
            />
          </Field>
          <Field label="Какой процесс" hint="Бизнес- или операционный процесс">
            <textarea
              className={textareaClass}
              value={value.process}
              onChange={set("process")}
              required
              placeholder="Например: обработка заявок 2-й линии поддержки"
            />
          </Field>
          <Field label="Подразделение / сегмент" hint="Из реестра или своё">
            <input
              className={inputClass}
              list="departments-list"
              value={value.department ?? ""}
              onChange={set("department")}
              placeholder="Например: БИТ, B2C, БЭФС"
            />
            <datalist id="departments-list">
              {departments.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="animate-rise space-y-5">
          <Field label="Цель по метрикам">
            <input
              className={inputClass}
              value={value.metricGoal}
              onChange={set("metricGoal")}
              required
              placeholder="Снизить TTR на 20%, сократить ручной разбор на 30%"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Объём людей">
              <input
                className={inputClass}
                value={value.peopleImpact}
                onChange={set("peopleImpact")}
                required
                placeholder="120 специалистов"
              />
            </Field>
            <Field label="% экономии">
              <input
                className={inputClass}
                value={value.savingsPercent}
                onChange={set("savingsPercent")}
                required
                placeholder="15%"
              />
            </Field>
            <Field label="Рост выручки, %">
              <input
                className={inputClass}
                value={value.revenueGrowthPercent}
                onChange={set("revenueGrowthPercent")}
                required
                placeholder="0%"
              />
            </Field>
          </div>
          <Field label="Масштабирование" hint="Другие сегменты и процессы">
            <textarea
              className={textareaClass}
              value={value.scalability}
              onChange={set("scalability")}
              required
              placeholder="Можно перенести на смежные линии / макрорегионы"
            />
          </Field>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="animate-rise space-y-5">
          <Field label="Интеграции">
            <textarea
              className={textareaClass}
              value={value.integrations}
              onChange={set("integrations")}
              required
              placeholder="OTRS, ERP, Service Desk, внутренний API..."
            />
          </Field>

          <div>
            <div className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Готовность данных
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {DATA_READINESS.map((item) => (
                <Chip
                  key={item.value}
                  active={value.dataReadiness === item.value}
                  label={item.label}
                  hint={item.hint}
                  onClick={() =>
                    onChange({ ...value, dataReadiness: item.value })
                  }
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Источник финансирования
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FUNDING.map((item) => (
                <Chip
                  key={item.value}
                  active={value.fundingSource === item.value}
                  label={item.label}
                  onClick={() =>
                    onChange({ ...value, fundingSource: item.value })
                  }
                />
              ))}
            </div>
          </div>

          {value.fundingSource === "другое" ? (
            <Field label="Уточните источник">
              <input
                className={inputClass}
                value={value.fundingSourceOther ?? ""}
                onChange={set("fundingSourceOther")}
                required
                placeholder="Опишите источник"
              />
            </Field>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={step === 0 || loading}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] disabled:opacity-40"
          >
            Назад
          </button>
          {recalculate && onCancelEdit ? (
            <button
              type="button"
              disabled={loading}
              onClick={onCancelEdit}
              className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--brand)] disabled:opacity-40"
            >
              К паспорту
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {loading ? (
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--line)]">
              <div className="loading-bar h-full w-full" />
            </div>
          ) : null}
          <button
            type="submit"
            disabled={loading || (step < STEPS.length - 1 && !canGoNext())}
            className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] px-5 py-3 text-sm font-semibold text-[#041018] shadow-[var(--shadow)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Анализируем…"
              : step < STEPS.length - 1
                ? "Далее"
                : recalculate
                  ? "Пересчитать паспорт"
                  : "Сформировать паспорт"}
          </button>
        </div>
      </div>
    </form>
  );
}
