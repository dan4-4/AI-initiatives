export type DecisionBandId =
  | "rework"
  | "justify"
  | "provider"
  | "develop";

export interface DecisionBand {
  id: DecisionBandId;
  min: number;
  max: number;
  label: string;
  hint: string;
  colorVar: string;
  softVar: string;
}

export const DECISION_BANDS: DecisionBand[] = [
  {
    id: "rework",
    min: 0,
    max: 30,
    label: "Переработать запрос",
    hint: "Слишком мало ясности или ИИ здесь не уместен",
    colorVar: "var(--danger)",
    softVar: "var(--danger-soft)",
  },
  {
    id: "justify",
    min: 31,
    max: 55,
    label: "Требует обоснования",
    hint: "Нужны метрики, данные или уточнение эффекта",
    colorVar: "var(--warn)",
    softVar: "var(--warn-soft)",
  },
  {
    id: "provider",
    min: 56,
    max: 75,
    label: "Через куратора",
    hint: "Имеет смысл — ведёт куратор, гибридная или сопровождаемая реализация",
    colorVar: "var(--brand-2)",
    softVar: "var(--accent-soft)",
  },
  {
    id: "develop",
    min: 76,
    max: 100,
    label: "Разрабатывать",
    hint: "Сильная заявка — можно брать в работу",
    colorVar: "var(--brand)",
    softVar: "var(--brand-soft)",
  },
];

export function getDecisionBand(score: number): DecisionBand {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    DECISION_BANDS.find((b) => clamped >= b.min && clamped <= b.max) ??
    DECISION_BANDS[1]
  );
}

/** Fallback, если модель не вернула балл. */
export function scoreFromAiVerdict(
  verdict: "да" | "нет" | "частично",
): number {
  if (verdict === "да") return 82;
  if (verdict === "нет") return 22;
  return 48;
}
