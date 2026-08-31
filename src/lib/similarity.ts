import type { InitiativeInput, RegistryInitiative, SimilarMatch } from "./types";

const STOP_WORDS = new Set([
  "и",
  "в",
  "во",
  "на",
  "по",
  "для",
  "с",
  "со",
  "к",
  "от",
  "из",
  "у",
  "о",
  "об",
  "за",
  "под",
  "над",
  "при",
  "про",
  "это",
  "как",
  "что",
  "или",
  "а",
  "но",
  "же",
  "бы",
  "ли",
  "не",
  "ни",
  "то",
  "та",
  "те",
  "тот",
  "эта",
  "эти",
  "их",
  "его",
  "ее",
  "мы",
  "вы",
  "он",
  "она",
  "они",
  "быть",
  "есть",
  "будет",
  "также",
  "через",
  "между",
  "чтобы",
  "если",
  "уже",
  "еще",
  "ещё",
  "очень",
  "можно",
  "нужно",
  "более",
  "менее",
  "the",
  "and",
  "for",
  "with",
  "from",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^a-zа-я0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function buildQueryText(input: InitiativeInput): string {
  return [
    input.problem,
    input.process,
    input.metricGoal,
    input.integrations,
    input.scalability,
    input.department ?? "",
  ].join(" ");
}

function documentText(item: RegistryInitiative): string {
  return [item.title, item.description, item.department, item.technologies].join(
    " ",
  );
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  return tf;
}

/**
 * Lightweight TF-IDF cosine similarity over title+description.
 */
export function findSimilarInitiatives(
  input: InitiativeInput,
  registry: RegistryInitiative[],
  topN = 10,
): SimilarMatch[] {
  const queryTokens = tokenize(buildQueryText(input));
  if (queryTokens.length === 0 || registry.length === 0) return [];

  const docs = registry.map((initiative) => ({
    initiative,
    tokens: tokenize(documentText(initiative)),
  }));

  const df = new Map<string, number>();
  for (const doc of docs) {
    const unique = new Set(doc.tokens);
    for (const token of unique) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }

  const N = docs.length;
  const idf = (token: string) => Math.log((N + 1) / ((df.get(token) ?? 0) + 1)) + 1;

  const queryTf = termFrequency(queryTokens);
  const queryVec = new Map<string, number>();
  let queryNorm = 0;
  for (const [token, tf] of queryTf) {
    const weight = (tf / queryTokens.length) * idf(token);
    queryVec.set(token, weight);
    queryNorm += weight * weight;
  }
  queryNorm = Math.sqrt(queryNorm) || 1;

  const scored: SimilarMatch[] = docs.map(({ initiative, tokens }) => {
    if (tokens.length === 0) {
      return { initiative, score: 0 };
    }

    const docTf = termFrequency(tokens);
    let dot = 0;
    let docNorm = 0;

    for (const [token, tf] of docTf) {
      const weight = (tf / tokens.length) * idf(token);
      docNorm += weight * weight;
      const q = queryVec.get(token);
      if (q) dot += q * weight;
    }

    docNorm = Math.sqrt(docNorm) || 1;

    // Slight boost when title shares tokens with the problem statement
    const titleTokens = new Set(tokenize(initiative.title));
    const titleOverlap = queryTokens.filter((t) => titleTokens.has(t)).length;
    const titleBoost = titleOverlap > 0 ? 0.08 * Math.min(titleOverlap, 5) : 0;

    const score = dot / (queryNorm * docNorm) + titleBoost;
    return { initiative, score };
  });

  return scored
    .filter((m) => m.score > 0.02)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
