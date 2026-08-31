import * as XLSX from "xlsx";
import type { EvaluateResponse, InitiativeInput } from "./types";

/** Скачать паспорт инициативы в Excel (.xlsx) */
export function downloadPassportExcel(
  data: EvaluateResponse,
  input?: InitiativeInput | null,
): void {
  const { passport, similarCandidates, historyId } = data;
  const rows: Array<[string, string]> = [
    ["Поле", "Значение"],
    ["ID истории", historyId ?? ""],
    ["Сегмент", passport.segment],
    ["Куратор", passport.curator],
    ["Вердикт ИИ", passport.aiNecessity.verdict],
    ["Обоснование ИИ", passport.aiNecessity.rationale],
    ["Балл", String(passport.decision?.score ?? "")],
    ["Зона решения", passport.decision?.band ?? ""],
    ["Обоснование балла", passport.decision?.rationale ?? ""],
    ["Технология", passport.technology.stack],
    ["Технология · пояснение", passport.technology.summary],
    ["Поставка · форма", passport.delivery.form],
    ["Поставка · детали", passport.delivery.details],
    [
      "Эффект · трудозатраты",
      passport.financialEffect.laborCostReductionRub,
    ],
    ["Эффект · выручка", passport.financialEffect.revenueGrowthRub],
    ["Бюджет · пилот", passport.budget.pilot],
    ["Бюджет · пром", passport.budget.production],
    ["Коридор · tier", passport.projectCost?.tier ?? ""],
    ["Коридор · название", passport.projectCost?.tierLabel ?? ""],
    ["Коридор · диапазон", passport.projectCost?.rangeRub ?? ""],
    ["Коридор · оценка", passport.projectCost?.estimateRub ?? ""],
    ["Коридор · обоснование", passport.projectCost?.rationale ?? ""],
    ["Разумность идеи", passport.comments.reasonableness],
    ["Вопросы", passport.comments.questions.join("\n")],
  ];

  if (input) {
    rows.push(
      ["—", "—"],
      ["Заявка · проблема", input.problem],
      ["Заявка · процесс", input.process],
      ["Заявка · метрика", input.metricGoal],
      ["Заявка · люди", input.peopleImpact],
      ["Заявка · % экономии", input.savingsPercent],
      ["Заявка · рост выручки %", input.revenueGrowthPercent],
      ["Заявка · масштабирование", input.scalability],
      ["Заявка · интеграции", input.integrations],
      ["Заявка · данные", input.dataReadiness],
      ["Заявка · финансирование", input.fundingSource],
      ["Заявка · подразделение", input.department ?? ""],
    );
  }

  const similarRows = [
    ["#", "Название", "Похожесть", "Подразделение", "Технологии", "URL", "Причина"],
    ...passport.comments.similarLinks.map((link, i) => [
      String(i + 1),
      link.title,
      "",
      link.department ?? "",
      link.technologies ?? "",
      link.url,
      link.reason,
    ]),
    ...similarCandidates.map((c, i) => [
      `R${i + 1}`,
      c.title,
      String(c.score),
      c.department,
      c.technologies,
      c.serviceUrl,
      "кандидат реестра (лексика)",
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const wsPassport = XLSX.utils.aoa_to_sheet(rows);
  wsPassport["!cols"] = [{ wch: 28 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsPassport, "Паспорт");

  const wsSimilar = XLSX.utils.aoa_to_sheet(similarRows);
  wsSimilar["!cols"] = [
    { wch: 4 },
    { wch: 40 },
    { wch: 12 },
    { wch: 16 },
    { wch: 20 },
    { wch: 30 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSimilar, "Похожие");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `passport-${stamp}.xlsx`);
}

export function passportShareUrl(historyId: string): string {
  if (typeof window === "undefined") return `/?h=${historyId}`;
  const url = new URL(window.location.href);
  url.searchParams.set("h", historyId);
  url.hash = "";
  return url.toString();
}
