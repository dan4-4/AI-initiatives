import { describe, expect, it } from "vitest";
import {
  DAY_RATE_RUB,
  ensureRubSuffix,
  formatRubShort,
  FTE_MONTH_RUB,
  getProjectCostTier,
  WORK_DAYS_PER_MONTH,
} from "@/lib/costing";

describe("costing", () => {
  it("считает FTE месяц из ставки и рабочих дней", () => {
    expect(WORK_DAYS_PER_MONTH).toBe(22);
    expect(DAY_RATE_RUB).toBe(20_000);
    expect(FTE_MONTH_RUB).toBe(440_000);
  });

  it("formatRubShort форматирует тысячи и миллионы", () => {
    expect(formatRubShort(0)).toBe("0 ₽");
    expect(formatRubShort(300_000)).toBe("300 тыс. ₽");
    expect(formatRubShort(1_000_000)).toBe("1 млн ₽");
  });

  it("ensureRubSuffix добавляет ₽ и снимает префикс оценка", () => {
    expect(ensureRubSuffix("150000")).toMatch(/150000.*₽/);
    expect(ensureRubSuffix("оценка: 5–8 млн руб.")).toBe("5–8 млн руб.");
    expect(ensureRubSuffix("")).toBe("");
  });

  it("getProjectCostTier возвращает известные коридоры", () => {
    expect(getProjectCostTier("refinement").minRub).toBe(300_000);
    expect(getProjectCostTier("unknown").id).toBe("neuro_gateway");
  });
});
