import { describe, expect, it } from "vitest";
import { extractJson, normalizePassport } from "@/lib/llm";

describe("passport parse", () => {
  it("extractJson достаёт объект из markdown fence", () => {
    const raw = 'Вот ответ:\n```json\n{"segment":"B2C","aiNecessity":{"verdict":"да"}}\n```';
    expect(extractJson(raw)).toMatchObject({ segment: "B2C" });
  });

  it("extractJson падает на тексте без JSON", () => {
    expect(() => extractJson("просто текст без объекта")).toThrow(/JSON/);
  });

  it("normalizePassport нормализует вердикт, балл и деньги", () => {
    const passport = normalizePassport({
      segment: "БИТ",
      curator: "Куратор",
      technology: { stack: "RAG", summary: "поиск" },
      delivery: { form: "API", details: "через шлюз" },
      financialEffect: {
        laborCostReductionRub: "оценка: 1 млн",
        revenueGrowthRub: "0",
      },
      budget: { pilot: "150000", production: "500000 руб." },
      projectCost: {
        tier: "refinement",
        tierLabel: "Простое приложение",
        rangeRub: "300 тыс. – 1 млн ₽",
        estimateRub: "800000",
        rationale: "нужны интеграции",
      },
      comments: {
        reasonableness: "разумно",
        questions: ["Есть ли разметка?"],
        similarLinks: [{ title: "A", url: "https://x", reason: "похоже" }],
      },
      aiNecessity: { verdict: "ДА", rationale: "нужен NLP" },
      decision: { score: 88, rationale: "сильная метрика" },
    });

    expect(passport.aiNecessity.verdict).toBe("да");
    expect(passport.decision.score).toBe(88);
    expect(passport.decision.band).toBe("Разрабатывать");
    expect(passport.budget.pilot).toMatch(/₽/);
    expect(passport.budget.production).toMatch(/руб/);
    expect(passport.projectCost?.tier).toBe("refinement");
    expect(passport.comments.questions).toHaveLength(1);
  });

  it("normalizePassport подставляет балл из вердикта при битом score", () => {
    const passport = normalizePassport({
      aiNecessity: { verdict: "нет" },
      decision: { score: "не число" },
    });
    expect(passport.decision.score).toBeGreaterThanOrEqual(0);
    expect(passport.decision.score).toBeLessThanOrEqual(100);
    expect(passport.aiNecessity.verdict).toBe("нет");
  });
});
