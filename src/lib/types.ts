export type DataReadiness = "есть" | "частично" | "нет";

export type FundingSource =
  | "OPEX подразделения"
  | "CAPEX / инвестиционный проект"
  | "бюджет ЦК ИИ"
  | "совместное финансирование"
  | "другое";

export interface InitiativeInput {
  problem: string;
  process: string;
  metricGoal: string;
  peopleImpact: string;
  savingsPercent: string;
  scalability: string;
  revenueGrowthPercent: string;
  integrations: string;
  dataReadiness: DataReadiness;
  fundingSource: FundingSource;
  fundingSourceOther?: string;
  /** Optional: suggested segment from form select */
  department?: string;
}

export interface RegistryInitiative {
  id: string;
  title: string;
  description: string;
  status: string;
  department: string;
  executor: string;
  owner: string;
  ownerEmail: string;
  contactPerson: string;
  contactEmail: string;
  technologies: string;
  businessEffect: string;
  budgetMln: string;
  projectLead: string;
  serviceUrl: string;
  accessInstructions: string;
  startDate: string;
}

export interface SimilarMatch {
  initiative: RegistryInitiative;
  score: number;
}

export type AiNecessityVerdict = "да" | "нет" | "частично";

export type DecisionBandLabel =
  | "Переработать запрос"
  | "Требует обоснования"
  | "Через куратора"
  | "Разрабатывать";

export interface AiNecessity {
  verdict: AiNecessityVerdict;
  rationale: string;
}

export interface DecisionScore {
  /** 0–100 по шкале решений */
  score: number;
  band: DecisionBandLabel;
  rationale: string;
}

export interface PassportSimilarLink {
  title: string;
  url: string;
  reason: string;
  department?: string;
  technologies?: string;
}

export interface InitiativePassport {
  segment: string;
  curator: string;
  technology: {
    stack: string;
    summary: string;
  };
  /** Что лучше использовать как канал поставки */
  delivery: {
    form: string;
    details: string;
  };
  financialEffect: {
    laborCostReductionRub: string;
    revenueGrowthRub: string;
  };
  budget: {
    pilot: string;
    production: string;
  };
  /** Оценка стоимости реализации по сложности (может отсутствовать в старых записях истории) */
  projectCost?: {
    tier: "neuro_gateway" | "refinement" | "full_dev";
    tierLabel: string;
    rangeRub: string;
    estimateRub: string;
    rationale: string;
  };
  comments: {
    reasonableness: string;
    questions: string[];
    similarLinks: PassportSimilarLink[];
  };
  aiNecessity: AiNecessity;
  decision: DecisionScore;
}

export interface EvaluateResponse {
  passport: InitiativePassport;
  similarCandidates: Array<{
    id: string;
    title: string;
    score: number;
    department: string;
    technologies: string;
    serviceUrl: string;
  }>;
  /** id записи в истории (если сохранено) */
  historyId?: string;
}

export interface PassportHistoryEntry {
  id: string;
  createdAt: string;
  title: string;
  input: InitiativeInput;
  passport: InitiativePassport;
  similarCandidates: EvaluateResponse["similarCandidates"];
}

export interface PassportHistorySummary {
  id: string;
  createdAt: string;
  title: string;
  segment: string;
  decisionScore: number | null;
  decisionBand: string | null;
  aiVerdict: AiNecessityVerdict | null;
  department: string;
}
