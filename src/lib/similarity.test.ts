import { describe, expect, it } from "vitest";
import { findSimilarInitiatives } from "@/lib/similarity";
import type { InitiativeInput, RegistryInitiative } from "@/lib/types";

const baseInput: InitiativeInput = {
  problem: "Автоматическая классификация тематик обращений клиентов в CRM",
  process: "Диспетчеризация обращений из личного кабинета в МУЗ",
  metricGoal: "Снизить долю ошибок классификации до 5%",
  peopleImpact: "диспетчеры НДС",
  savingsPercent: "15",
  scalability: "макрорегионы",
  revenueGrowthPercent: "0",
  integrations: "ЛК, МУЗ, CRM",
  dataReadiness: "частично",
  fundingSource: "OPEX подразделения",
  department: "B2C",
};

function init(
  partial: Partial<RegistryInitiative> & Pick<RegistryInitiative, "id" | "title">,
): RegistryInitiative {
  return {
    description: "",
    status: "active",
    department: "B2C",
    executor: "",
    owner: "",
    ownerEmail: "",
    contactPerson: "",
    contactEmail: "",
    technologies: "",
    businessEffect: "",
    budgetMln: "",
    projectLead: "",
    serviceUrl: "",
    accessInstructions: "",
    startDate: "",
    ...partial,
  };
}

describe("similarity", () => {
  it("поднимает релевантные инициативы выше нерелевантных", () => {
    const registry = [
      init({
        id: "1",
        title: "ИИ-классификация тематик обращений в CRM",
        description:
          "Автоматическое определение тематики обращения клиента для маршрутизации диспетчером",
        department: "B2C",
      }),
      init({
        id: "2",
        title: "Прогноз погоды для полевых бригад",
        description: "Метеоданные и график выездов",
        department: "Сеть",
      }),
    ];

    const matches = findSimilarInitiatives(baseInput, registry, 5);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].initiative.id).toBe("1");
    expect(matches[0].score).toBeGreaterThan(matches[1]?.score ?? 0);
  });

  it("возвращает пустой список при пустом реестре", () => {
    expect(findSimilarInitiatives(baseInput, [], 5)).toEqual([]);
  });
});
