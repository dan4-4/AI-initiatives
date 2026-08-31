import type {
  InitiativeInput,
  InitiativePassport,
  SimilarMatch,
} from "./types";
import { getDecisionBand, scoreFromAiVerdict } from "./decisionScale";
import {
  DAY_RATE_RUB,
  FTE_MONTH_RUB,
  FTE_YEAR_RUB,
  getProjectCostTier,
  PROJECT_COST_TIERS,
  WORK_DAYS_PER_MONTH,
  formatRubShort,
  rateAssumptionsText,
  ensureRubSuffix,
} from "./costing";
import { log } from "./logger";

function getTimeoutMs(): number {
  return Number(process.env.AI_TIMEOUT_MS || 90_000);
}

function getMaxAttempts(): number {
  return Math.max(1, Number(process.env.AI_JSON_RETRIES || 2));
}

function getApiKey(): string {
  const apiKey = process.env.AI_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!apiKey) {
    throw new Error(
      "Не задан AI_API_KEY. Скопируйте .env.example в .env.local и укажите токен.",
    );
  }
  return apiKey;
}

function getBaseUrl(): string {
  return (
    process.env.AI_BASE_URL?.replace(/\/$/, "") || "https://ai.rt.ru/api/1.0"
  );
}

function getModel(): string {
  return process.env.AI_MODEL || "Qwen/Qwen3-Next-80B-A3B-Instruct-FP8";
}

/** Путь нейрошлюза для Qwen/Leopold (см. api_нейрошлюз.ipynb). */
function getChatPath(): string {
  const path = process.env.AI_CHAT_PATH || "/lleopold/chatMulti";
  return path.startsWith("/") ? path : `/${path}`;
}

function buildSystemPrompt(): string {
  return `Ты эксперт по оценке ИИ-инициатив в крупной компании (телеком / enterprise).
По входным данным идеи и списку похожих инициатив из корпоративного реестра сформируй паспорт инициативы.

Нормативы расчёта стоимости труда (обязательно используй):
- Ставка 1 человека: ${DAY_RATE_RUB.toLocaleString("ru-RU")} ₽ в сутки
- ${WORK_DAYS_PER_MONTH} рабочих дней в месяце
- 1 FTE ≈ ${FTE_MONTH_RUB.toLocaleString("ru-RU")} ₽/мес. ≈ ${FTE_YEAR_RUB.toLocaleString("ru-RU")} ₽/год
При оценке экономии трудозатрат переводи FTE/% экономии в рубли через эту ставку (с пометкой «оценка»).

Коридоры стоимости реализации проекта (projectCost) — выбери один tier по сложности:
1) neuro_gateway — «На базе Нейрошлюза»: 0–300 тыс. ₽ (несложный проект без особых вложений)
2) refinement — «Простое приложение»: 300 тыс. – 1 млн ₽
3) full_dev — «Полноценная разработка»: 1–5 млн ₽
В estimateRub, budget.pilot и budget.production указывай только сумму со знаком ₽, без слова «оценка» (например «150000 ₽», «5–8 млн ₽»).
В estimateRub укажи примерную сумму внутри выбранного коридора; в rangeRub — сам коридор текстом.

Правила:
1. Верни ТОЛЬКО валидный JSON без markdown и пояснений вне JSON.
2. Оцени необходимость ИИ: "да" | "нет" | "частично" с кратким обоснованием.
3. Выставь decision.score от 0 до 100 по шкале решений:
   0–30 Переработать запрос; 31–55 Требует обоснования; 56–75 Через куратора; 76–100 Разрабатывать.
4. technology: объект { stack, summary }. stack — коротко, summary — 1 предложение расшифровки.
5. delivery.form — канал (Интерфейс / API / Дашборд / чат-бот / комбинация). details — как встроить.
6. Финансы: считай через ставку выше. budget.pilot/production согласуй с projectCost (пилот обычно ниже полного коридора).
7. projectCost.tier обязателен и должен быть одним из: neuro_gateway | refinement | full_dev.
8. Ссылки на похожие — ТОЛЬКО из кандидатов реестра. Не выдумывай URL.
9. Пиши по-русски, деловым стилем, кратко.`;
}

function buildUserPrompt(
  input: InitiativeInput,
  matches: SimilarMatch[],
): string {
  const funding =
    input.fundingSource === "другое" && input.fundingSourceOther
      ? `другое: ${input.fundingSourceOther}`
      : input.fundingSource;

  const candidates = matches.map((m, i) => ({
    index: i + 1,
    id: m.initiative.id,
    title: m.initiative.title,
    description: m.initiative.description.slice(0, 600),
    department: m.initiative.department,
    technologies: m.initiative.technologies,
    status: m.initiative.status,
    owner: m.initiative.owner,
    projectLead: m.initiative.projectLead,
    businessEffect: m.initiative.businessEffect,
    budgetMln: m.initiative.budgetMln,
    serviceUrl: m.initiative.serviceUrl,
    score: Number(m.score.toFixed(4)),
  }));

  const schema = {
    segment: "строка — бизнес-сегмент / подразделение",
    curator: "строка — кто куратор (роль или ФИО, если выводимо)",
    technology: {
      stack: "кратко, напр. RAG + NLP",
      summary: "1 предложение: что это значит простыми словами",
    },
    delivery: {
      form: "Интерфейс / API / Дашборд / чат-бот / комбинация",
      details: "как встроить (1 предложение)",
    },
    financialEffect: {
      laborCostReductionRub: "оценка в руб./год или FTE, либо пустая строка",
      revenueGrowthRub: "оценка в руб./год, либо пустая строка / 0 руб.",
    },
    budget: {
      pilot: "сумма пилота, напр. «5–8 млн ₽», без слова «оценка»; либо пустая строка",
      production: "сумма прома, напр. «15–20 млн ₽», без слова «оценка»; либо пустая строка",
    },
    projectCost: {
      tier: '"neuro_gateway" | "refinement" | "full_dev"',
      tierLabel: "На базе Нейрошлюза | Простое приложение | Полноценная разработка",
      rangeRub: "напр. 0–300 тыс. ₽",
      estimateRub: "примерная сумма внутри коридора",
      rationale: "почему такой коридор сложности",
    },
    comments: {
      reasonableness: "строка — оценка разумности идеи",
      questions: ["массив строк — уточняющие вопросы"],
      similarLinks: [
        {
          title: "название из реестра",
          url: "ссылка из реестра или пустая строка",
          reason: "почему похожа",
          department: "опционально",
          technologies: "опционально",
        },
      ],
    },
    aiNecessity: {
      verdict: '"да" | "нет" | "частично"',
      rationale: "обоснование",
    },
    decision: {
      score: "число 0-100",
      band: '"Переработать запрос" | "Требует обоснования" | "Через куратора" | "Разрабатывать"',
      rationale: "почему такой балл",
    },
  };

  return JSON.stringify(
    {
      input: {
        problem: input.problem,
        process: input.process,
        metricGoal: input.metricGoal,
        peopleImpact: input.peopleImpact,
        savingsPercent: input.savingsPercent,
        scalability: input.scalability,
        revenueGrowthPercent: input.revenueGrowthPercent,
        integrations: input.integrations,
        dataReadiness: input.dataReadiness,
        fundingSource: funding,
        department: input.department || null,
      },
      similarCandidatesFromRegistry: candidates,
      costingAssumptions: {
        dayRateRub: DAY_RATE_RUB,
        workDaysPerMonth: WORK_DAYS_PER_MONTH,
        fteMonthRub: FTE_MONTH_RUB,
        fteYearRub: FTE_YEAR_RUB,
        note: rateAssumptionsText(),
        projectCostTiers: PROJECT_COST_TIERS.map((t) => ({
          tier: t.id,
          label: t.label,
          range: `${formatRubShort(t.minRub)} – ${formatRubShort(t.maxRub)}`,
          hint: t.hint,
        })),
      },
      outputSchema: schema,
    },
    null,
    2,
  );
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => asString(v)).filter(Boolean);
}

export function normalizePassport(raw: unknown): InitiativePassport {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const financial = (obj.financialEffect ?? {}) as Record<string, unknown>;
  const budget = (obj.budget ?? {}) as Record<string, unknown>;
  const comments = (obj.comments ?? {}) as Record<string, unknown>;
  const ai = (obj.aiNecessity ?? {}) as Record<string, unknown>;
  const decisionRaw = (obj.decision ?? {}) as Record<string, unknown>;

  const similarLinksRaw = Array.isArray(comments.similarLinks)
    ? comments.similarLinks
    : [];

  const verdictRaw = asString(ai.verdict, "частично").toLowerCase();
  const verdict =
    verdictRaw === "да" || verdictRaw === "нет" || verdictRaw === "частично"
      ? verdictRaw
      : "частично";

  let score = Number(decisionRaw.score);
  if (!Number.isFinite(score)) {
    score = scoreFromAiVerdict(verdict);
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const bandMeta = getDecisionBand(score);

  const deliveryRaw = obj.delivery;
  let deliveryForm = "не определено";
  let deliveryDetails = "";
  if (typeof deliveryRaw === "string") {
    deliveryForm = asString(deliveryRaw, "не определено");
  } else if (deliveryRaw && typeof deliveryRaw === "object") {
    const d = deliveryRaw as Record<string, unknown>;
    deliveryForm = asString(d.form || d.channel || d.type, "не определено");
    deliveryDetails = asString(d.details || d.description || d.how);
  }

  const techRaw = obj.technology;
  let techStack = "не определено";
  let techSummary = "";
  if (typeof techRaw === "string") {
    techStack = asString(techRaw, "не определено");
  } else if (techRaw && typeof techRaw === "object") {
    const t = techRaw as Record<string, unknown>;
    techStack = asString(t.stack || t.name || t.title, "не определено");
    techSummary = asString(t.summary || t.description || t.explain);
  }

  const cleanMoney = (value: unknown) => {
    let s = asString(value);
    if (!s) return "";
    if (/недостаточно|не определ|нет данных|n\/a/i.test(s)) return "";
    // убрать префикс «оценка:» / «оценка» — в UI заголовок уже «Пилот»/«Пром»
    s = s.replace(/^\s*оценка\s*[:\-–—]?\s*/i, "").trim();
    return s;
  };

  const projectCostRaw = (obj.projectCost ?? {}) as Record<string, unknown>;
  const tierRaw = asString(projectCostRaw.tier, "neuro_gateway")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const tierId =
    tierRaw === "refinement" ||
    tierRaw === "full_dev" ||
    tierRaw === "neuro_gateway"
      ? tierRaw
      : /доработ|простое приложени/i.test(asString(projectCostRaw.tierLabel))
        ? "refinement"
        : /полноцен|разработ/i.test(asString(projectCostRaw.tierLabel))
          ? "full_dev"
          : "neuro_gateway";
  const tierMeta = getProjectCostTier(tierId);

  return {
    segment: asString(obj.segment, "не определено"),
    curator: asString(obj.curator, "не определено"),
    technology: {
      stack: techStack,
      summary: techSummary,
    },
    delivery: {
      form: deliveryForm,
      details: deliveryDetails,
    },
    financialEffect: {
      laborCostReductionRub: cleanMoney(financial.laborCostReductionRub),
      revenueGrowthRub: cleanMoney(financial.revenueGrowthRub),
    },
    budget: {
      pilot: ensureRubSuffix(cleanMoney(budget.pilot)),
      production: ensureRubSuffix(cleanMoney(budget.production)),
    },
    projectCost: {
      tier: tierMeta.id,
      tierLabel: asString(projectCostRaw.tierLabel, tierMeta.label),
      rangeRub: asString(
        projectCostRaw.rangeRub,
        `${formatRubShort(tierMeta.minRub)} – ${formatRubShort(tierMeta.maxRub)}`,
      ),
      estimateRub: ensureRubSuffix(cleanMoney(projectCostRaw.estimateRub)),
      rationale: asString(projectCostRaw.rationale, tierMeta.hint),
    },
    comments: {
      reasonableness: asString(comments.reasonableness, ""),
      questions: asStringArray(comments.questions),
      similarLinks: similarLinksRaw.map((item) => {
        const link = (item && typeof item === "object" ? item : {}) as Record<
          string,
          unknown
        >;
        return {
          title: asString(link.title),
          url: asString(link.url),
          reason: asString(link.reason),
          department: asString(link.department) || undefined,
          technologies: asString(link.technologies) || undefined,
        };
      }),
    },
    aiNecessity: {
      verdict,
      rationale: asString(ai.rationale, ""),
    },
    decision: {
      score,
      band: bandMeta.label as InitiativePassport["decision"]["band"],
      rationale:
        asString(decisionRaw.rationale) ||
        asString(ai.rationale) ||
        bandMeta.hint,
    },
  };
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Модель вернула ответ без валидного JSON");
  }
}

function isRetryableLlmError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /валидного JSON|JSON|пустой ответ|AbortError|timeout|таймаут|fetch failed|ECONNRESET|ETIMEDOUT|Нейрошлюз HTTP 5/i.test(
      message,
    ) || (error instanceof Error && error.name === "AbortError")
  );
}

/** Разбор ответа нейрошлюза (как extract_text в ноутбуке). */
function extractText(js: unknown): string {
  if (typeof js === "string") return js;
  if (!js || typeof js !== "object") return String(js ?? "");

  const obj = js as Record<string, unknown>;
  if (obj.error) {
    throw new Error(
      `Ошибка нейрошлюза: ${asString(obj.status_code)} ${asString(obj.text) || asString(obj.message) || JSON.stringify(obj.error)}`,
    );
  }

  const message = obj.message;
  if (message && typeof message === "object") {
    const content = (message as Record<string, unknown>).content;
    if (content !== undefined && content !== null) {
      return String(content).trim();
    }
  }

  const choices = obj.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const msg = (choices[0] as Record<string, unknown>).message;
    if (msg && typeof msg === "object") {
      return asString((msg as Record<string, unknown>).content);
    }
  }

  if (Array.isArray(js) && js[0] && typeof js[0] === "object") {
    const first = js[0] as Record<string, unknown>;
    const nested = first.message;
    if (nested && typeof nested === "object") {
      return asString((nested as Record<string, unknown>).content);
    }
    if (typeof nested === "string") return nested.trim();
  }

  if (typeof obj.content === "string") return obj.content.trim();
  if (typeof obj.text === "string") return obj.text.trim();
  if (typeof obj.result === "string") return obj.result.trim();

  throw new Error(
    `Не удалось извлечь текст ответа нейрошлюза: ${JSON.stringify(js).slice(0, 400)}`,
  );
}

async function callNeuroGateway(
  systemPrompt: string,
  userPrompt: string,
  attempt: number,
): Promise<string> {
  const url = `${getBaseUrl()}${getChatPath()}`;
  const payload = {
    chat: {
      model: getModel(),
      system_prompt: systemPrompt,
      max_new_tokens: Number(process.env.AI_MAX_TOKENS || 4096),
      no_repeat_ngram_size: 15,
      repetition_penalty: 1.1,
      temperature: attempt > 1 ? 0.1 : 0.2,
      top_k: 40,
      top_p: 0.9,
      contents: [{ type: "text", text: userPrompt }],
    },
  };

  const timeoutMs = getTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = performance.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsed: unknown = rawText;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      // оставляем как строку
    }

    const latencyMs = Math.round(performance.now() - t0);

    if (!response.ok) {
      const detail =
        typeof parsed === "object" && parsed
          ? JSON.stringify(parsed).slice(0, 800)
          : rawText.slice(0, 800);
      log.error("llm", "neurogateway http error", {
        status: response.status,
        attempt,
        latencyMs,
      });
      throw new Error(
        `Нейрошлюз HTTP ${response.status}: ${detail || "пустой ответ"}`,
      );
    }

    log.info("llm", "neurogateway ok", { attempt, latencyMs });
    return extractText(parsed);
  } catch (error) {
    const latencyMs = Math.round(performance.now() - t0);
    if (error instanceof Error && error.name === "AbortError") {
      log.error("llm", "neurogateway timeout", { attempt, timeoutMs, latencyMs });
      throw new Error(
        `Таймаут нейрошлюза (${Math.round(timeoutMs / 1000)} с)`,
      );
    }
    log.error("llm", "neurogateway call failed", {
      attempt,
      latencyMs,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function generatePassport(
  input: InitiativeInput,
  matches: SimilarMatch[],
): Promise<InitiativePassport> {
  const systemPrompt = buildSystemPrompt();
  const baseUserPrompt = buildUserPrompt(input, matches);
  const maxAttempts = getMaxAttempts();
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const userPrompt =
      attempt === 1
        ? baseUserPrompt
        : `${baseUserPrompt}\n\nВажно: предыдущий ответ был с битым или невалидным JSON. Верни ТОЛЬКО валидный JSON-объект без markdown и пояснений.`;

    try {
      const content = await callNeuroGateway(systemPrompt, userPrompt, attempt);
      if (!content.trim()) {
        throw new Error("Пустой ответ от модели");
      }
      return normalizePassport(extractJson(content));
    } catch (error) {
      lastError = error;
      const retryable = isRetryableLlmError(error);
      log.warn("llm", "passport generation attempt failed", {
        attempt,
        maxAttempts,
        retryable,
        error: error instanceof Error ? error.message : String(error),
      });
      if (!retryable || attempt === maxAttempts) break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Не удалось сформировать паспорт");
}
