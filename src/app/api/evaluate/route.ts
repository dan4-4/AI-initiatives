import { NextResponse } from "next/server";
import { savePassportHistory } from "@/lib/history";
import { generatePassport } from "@/lib/llm";
import { log, requestId, startTimer } from "@/lib/logger";
import { loadRegistry } from "@/lib/registry";
import { findSimilarInitiatives } from "@/lib/similarity";
import type { EvaluateResponse, InitiativeInput } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateInput(body: unknown): InitiativeInput {
  if (!body || typeof body !== "object") {
    throw new Error("Ожидается JSON-объект");
  }

  const data = body as Record<string, unknown>;
  const required = [
    "problem",
    "process",
    "metricGoal",
    "peopleImpact",
    "savingsPercent",
    "scalability",
    "revenueGrowthPercent",
    "integrations",
    "dataReadiness",
    "fundingSource",
  ] as const;

  for (const key of required) {
    if (!isNonEmptyString(data[key])) {
      throw new Error(`Заполните поле: ${key}`);
    }
  }

  const dataReadiness = data.dataReadiness as InitiativeInput["dataReadiness"];
  if (!["есть", "частично", "нет"].includes(dataReadiness)) {
    throw new Error("Некорректная готовность данных");
  }

  const fundingSource = data.fundingSource as InitiativeInput["fundingSource"];
  const allowedFunding = [
    "OPEX подразделения",
    "CAPEX / инвестиционный проект",
    "бюджет ЦК ИИ",
    "совместное финансирование",
    "другое",
  ];
  if (!allowedFunding.includes(fundingSource)) {
    throw new Error("Некорректный источник финансирования");
  }

  return {
    problem: String(data.problem).trim(),
    process: String(data.process).trim(),
    metricGoal: String(data.metricGoal).trim(),
    peopleImpact: String(data.peopleImpact).trim(),
    savingsPercent: String(data.savingsPercent).trim(),
    scalability: String(data.scalability).trim(),
    revenueGrowthPercent: String(data.revenueGrowthPercent).trim(),
    integrations: String(data.integrations).trim(),
    dataReadiness,
    fundingSource,
    fundingSourceOther: isNonEmptyString(data.fundingSourceOther)
      ? data.fundingSourceOther.trim()
      : undefined,
    department: isNonEmptyString(data.department)
      ? data.department.trim()
      : undefined,
  };
}

export async function POST(request: Request) {
  const timer = startTimer();
  const rid = requestId(request);

  try {
    const body = await request.json();
    const input = validateInput(body);
    const registry = loadRegistry();
    const matches = findSimilarInitiatives(input, registry, 10);
    const passport = await generatePassport(input, matches);

    const response: EvaluateResponse = {
      passport,
      similarCandidates: matches.map((m) => ({
        id: m.initiative.id,
        title: m.initiative.title,
        score: Number(m.score.toFixed(4)),
        department: m.initiative.department,
        technologies: m.initiative.technologies,
        serviceUrl: m.initiative.serviceUrl,
      })),
    };

    try {
      const saved = savePassportHistory(input, response);
      response.historyId = saved.id;
    } catch (saveError) {
      log.error("evaluate", "history save failed", {
        requestId: rid,
        error:
          saveError instanceof Error ? saveError.message : String(saveError),
      });
    }

    log.info("evaluate", "ok", {
      requestId: rid,
      latencyMs: timer.ms(),
      matches: matches.length,
      score: passport.decision?.score,
      historyId: response.historyId ?? null,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка";
    log.error("evaluate", message, {
      requestId: rid,
      latencyMs: timer.ms(),
    });
    let status = 400;
    if (message.includes("AI_API_KEY")) status = 503;
    else if (
      message.includes("Нейрошлюз HTTP 5") ||
      message.includes("fetch failed") ||
      message.includes("Таймаут")
    )
      status = 502;
    return NextResponse.json({ error: message, requestId: rid }, { status });
  }
}
