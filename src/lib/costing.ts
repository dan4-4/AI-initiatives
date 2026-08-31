/** Нормативы для финансовых оценок инициатив */

export const WORK_DAYS_PER_MONTH = 22;
export const DAY_RATE_RUB = 20_000;
/** Средняя стоимость 1 FTE в месяц */
export const FTE_MONTH_RUB = WORK_DAYS_PER_MONTH * DAY_RATE_RUB; // 440_000
/** Средняя стоимость 1 FTE в год */
export const FTE_YEAR_RUB = FTE_MONTH_RUB * 12; // 5_280_000

export type ProjectCostTierId =
  | "neuro_gateway"
  | "refinement"
  | "full_dev";

export interface ProjectCostTier {
  id: ProjectCostTierId;
  label: string;
  minRub: number;
  maxRub: number;
  hint: string;
}

export const PROJECT_COST_TIERS: ProjectCostTier[] = [
  {
    id: "neuro_gateway",
    label: "На базе Нейрошлюза",
    minRub: 0,
    maxRub: 300_000,
    hint: "Несложный проект без особых вложений, в основном конфигурация шлюза",
  },
  {
    id: "refinement",
    label: "Простое приложение",
    minRub: 300_000,
    maxRub: 1_000_000,
    hint: "Простое приложение: интеграции и лёгкая кастомизация на базе платформы",
  },
  {
    id: "full_dev",
    label: "Полноценная разработка",
    minRub: 1_000_000,
    maxRub: 5_000_000,
    hint: "Отдельный продукт / существенная разработка с нуля",
  },
];

export function formatRubShort(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)} млн ₽`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)} тыс. ₽`;
  }
  return `${value} ₽`;
}

/** Добавляет ₽ к сумме, если знака ещё нет (для пилота/прома/оценок). */
export function ensureRubSuffix(value: string): string {
  let trimmed = value.trim().replace(/^\s*оценка\s*[:\-–—]?\s*/i, "");
  if (!trimmed) return "";
  if (/[₽р]|(руб)/i.test(trimmed)) return trimmed;
  // чистое число или число с пробелами/точками
  if (/^[\d\s.,]+$/.test(trimmed)) {
    return `${trimmed.replace(/\s+/g, "\u00a0")} ₽`;
  }
  return trimmed;
}

export function getProjectCostTier(id: string): ProjectCostTier {
  return (
    PROJECT_COST_TIERS.find((t) => t.id === id) ?? PROJECT_COST_TIERS[0]
  );
}

export function rateAssumptionsText(): string {
  return `Ставка: ${DAY_RATE_RUB.toLocaleString("ru-RU")} ₽/сутки, ${WORK_DAYS_PER_MONTH} рабочих дней/мес. (≈ ${(FTE_MONTH_RUB / 1000).toLocaleString("ru-RU")} тыс. ₽/мес. на 1 чел.)`;
}
