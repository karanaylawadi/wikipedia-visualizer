import type { ResolvedEntity, EvaluatedFact, EvaluationMetrics, StageDiagnostic } from "@/types/knowledge";
import type { CompiledOutput } from "./compiler";
import { containsPlaceholder } from "./placeholderDetector";
import { recordFallback, recordGeminiSuccess, recordGeminiFailure } from "./diagnostics";
import { callGeminiModel } from "@/lib/ai/geminiConfig";

const FORBIDDEN_WEAK_PHRASES = [
  "is widely known",
  "has a rich history",
  "remains influential",
  "played an important role",
  "is significant",
  "is important because",
  "has a long history",
  "continues to be studied",
  "is considered to be",
  "is a key element",
  "played a critical role"
];

// Helper to determine if a fact contains weak/generic sentences
export function isFactWeak(fact: string): boolean {
  const normalized = fact.toLowerCase();
  for (const phrase of FORBIDDEN_WEAK_PHRASES) {
    if (normalized.includes(phrase)) {
      return true;
    }
  }
  // Also check if fact is too short or generic
  if (fact.split(/\s+/).length < 5) {
    return true;
  }
  return false;
}

export async function evaluateFacts(
  resolved: ResolvedEntity,
  compiled: CompiledOutput,
  diagnostics: StageDiagnostic[] = []
): Promise<EvaluatedFact[]> {
  const rawFactsList: string[] = [];

  // Gather facts from triviaCandidates and sourceSection bullet points
  compiled.triviaCandidates.forEach((insight) => {
    if (insight && insight.fact) {
      const factText = insight.fact;
      if (!rawFactsList.includes(factText)) rawFactsList.push(factText);
    }
  });

  // Extract statements from sourceSections
  compiled.sourceSections.forEach((sec) => {
    const lines = sec.content.split(/[.\n]+/).map(s => s.trim()).filter(Boolean);
    lines.forEach((line) => {
      if (line.length > 20 && !rawFactsList.includes(line)) {
        rawFactsList.push(line);
      }
    });
  });

  // Helper to deduplicate facts that share 3-word phrases (prevents 4-word overlap when templates prepend words)
  const deduplicateFacts = (facts: string[]): string[] => {
    const seenPhrases = new Set<string>();
    const uniqueFacts: string[] = [];
    for (const fact of facts) {
      const words = fact.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/).filter(Boolean);
      let hasOverlap = false;
      const factPhrases: string[] = [];
      for (let i = 0; i < words.length - 2; i++) {
        const phrase = words.slice(i, i + 3).join(" ");
        factPhrases.push(phrase);
        if (seenPhrases.has(phrase)) {
          hasOverlap = true;
        }
      }
      if (!hasOverlap) {
        uniqueFacts.push(fact);
        factPhrases.forEach(p => seenPhrases.add(p));
      }
    }
    return uniqueFacts;
  };

  // Filter out obviously weak facts programmatically first and deduplicate overlapping phrases
  const candidateFacts = deduplicateFacts(rawFactsList.filter(fact => !isFactWeak(fact))).slice(0, 15);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || candidateFacts.length === 0) {
    recordFallback(diagnostics, "factEvaluator", !apiKey ? "no API key configured" : "no candidate facts");
    return getFallbackEvaluation(candidateFacts, resolved.canonicalTitle);
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a Stockfish-grade Fact Evaluation Engine for knowledge bases.
Evaluate the following candidate facts about "${resolved.canonicalTitle}" (ontology type: "${resolved.entityType}").

Candidate Facts:
${candidateFacts.map((fact, idx) => `[Fact ${idx + 1}] "${fact}"`).join("\n")}

For each fact, score it from 0.0 to 1.0 on:
1. "confidence": Certainty of the fact's accuracy.
2. "specificity": Specific dates, numbers, names, or technical details vs generic statements.
3. "narrativeValue": How engaging it is for storytelling.
4. "educationalValue": Scientific, technical, or historical lesson value.
5. "visualValue": Ability to be illustrated with a chart, diagram, or timeline node.
6. "uniqueness": Unusually surprising or counter-intuitive trivia.
7. "ontologyRelevance": Direct connection to "${resolved.entityType}" core concepts.

Calculate an overall weighted "score" (0.0 to 1.0) where specificity and ontologyRelevance carry the highest weights.
Provide a brief 1-sentence "reasoning" for your score.

Return a valid JSON object matching this schema:
{
  "evaluations": [
    {
      "fact": "string matching the original fact exactly",
      "score": number,
      "metrics": {
        "confidence": number,
        "specificity": number,
        "narrativeValue": number,
        "educationalValue": number,
        "visualValue": number,
        "uniqueness": number,
        "ontologyRelevance": number
      },
      "reasoning": "string"
    }
  ]
}

Only return raw JSON. Start with { and end with }. Do not wrap in markdown.`;

  const start = Date.now();
  try {
    const { response, meta } = await callGeminiModel(ai, {
      contents: prompt,
      config: { temperature: 0.1, maxOutputTokens: 4000 }
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { evaluations: EvaluatedFact[] };

    // Sort by overall score descending and filter out any with score < 0.65,
    // forbidden phrases, or placeholder-contaminated text.
    const evaluated = (parsed.evaluations || [])
      .filter(item => item.score >= 0.65 && !isFactWeak(item.fact) && !containsPlaceholder(item.fact))
      .sort((a, b) => b.score - a.score);

    recordGeminiSuccess(diagnostics, "factEvaluator", meta, Date.now() - start);

    if (evaluated.length === 0) {
      return deduplicateEvaluatedFacts(getFallbackEvaluation(candidateFacts, resolved.canonicalTitle));
    }

    return deduplicateEvaluatedFacts(evaluated);
  } catch (error) {
    console.warn("evaluateFacts failed, using fallback metrics", error);
    recordGeminiFailure(diagnostics, "factEvaluator", error, Date.now() - start);
    return deduplicateEvaluatedFacts(getFallbackEvaluation(candidateFacts, resolved.canonicalTitle));
  }
}

function deduplicateEvaluatedFacts(evaluated: EvaluatedFact[]): EvaluatedFact[] {
  const seenSentences = new Set<string>();
  const uniqueEvaluations: EvaluatedFact[] = [];
  
  for (const item of evaluated) {
    const sentences = item.fact.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    let hasDuplicate = false;
    for (const s of sentences) {
      const clean = s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
      if (clean.length < 15 || clean.split(/\s+/).length < 4) continue;
      if (seenSentences.has(clean)) {
        hasDuplicate = true;
        break;
      }
    }
    if (!hasDuplicate) {
      for (const s of sentences) {
        const clean = s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
        if (clean.length < 15 || clean.split(/\s+/).length < 4) continue;
        seenSentences.add(clean);
      }
      uniqueEvaluations.push(item);
    }
  }
  return uniqueEvaluations;
}

const SUPERLATIVE_PATTERN = /\b(first|only|largest|smallest|youngest|oldest|tallest|deepest|rarest|fastest|earliest|last)\b/i;
const LOCATION_PATTERN = /\b(city|country|nation|mountain|river|ocean|island|region|province|state|capital|building|palace|temple|theatre|studio)\b/i;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// Heuristic metrics computed from real, per-fact text signals — no two
// facts get identical numbers unless they genuinely score the same on
// every input signal. This replaces flat constants (confidence: 0.95,
// narrativeValue: 0.8, ... identical for every fact, every topic) that the
// V17 forensic audit found presented as if they were a measured
// evaluation (V17_FORENSIC_AUDIT.md, part of Bug #1's pattern — invented
// numbers presented as computed quality). These are still heuristics, not
// an LLM judgment, and are capped below what an LLM-verified score could
// reach.
function getFallbackEvaluation(facts: string[], canonicalTitle: string): EvaluatedFact[] {
  const titleTokens = canonicalTitle
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  return facts
    .map((fact) => {
      const hasPlaceholder = containsPlaceholder(fact);
      const words = fact.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const hasNumberOrDate = /\b(1\d{3}|2\d{3}|\d+%|\$\d+|\d+)\b/.test(fact);
      const properNounCount = (fact.match(/\b[A-Z][a-z]{2,}\b/g) || []).length;
      const properNounRatio = properNounCount / Math.max(1, wordCount);
      const mentionsTopic = titleTokens.some((t) => fact.toLowerCase().includes(t));
      const isWeak = isFactWeak(fact);

      const confidence = hasPlaceholder ? 0.2 : clamp01(0.5 + Math.min(wordCount, 30) / 60);
      const specificity = hasNumberOrDate ? 0.85 : clamp01(0.3 + properNounRatio);
      const narrativeValue = clamp01(0.3 + properNounRatio * 1.5);
      const educationalValue = hasNumberOrDate ? 0.75 : 0.5;
      const visualValue = LOCATION_PATTERN.test(fact) ? 0.7 : clamp01(0.3 + properNounRatio);
      const uniqueness = SUPERLATIVE_PATTERN.test(fact) ? 0.85 : 0.5;
      const ontologyRelevance = mentionsTopic ? 0.8 : 0.5;

      const metrics: EvaluationMetrics = {
        confidence, specificity, narrativeValue, educationalValue, visualValue, uniqueness, ontologyRelevance,
      };

      const score =
        isWeak || hasPlaceholder
          ? 0.3
          : clamp01((confidence + specificity + narrativeValue + educationalValue + visualValue + uniqueness + ontologyRelevance) / 7);

      return {
        fact,
        score,
        metrics,
        reasoning: hasPlaceholder
          ? "Fact contains placeholder text and was excluded."
          : isWeak
            ? "Fact contains generic or weak phrases."
            : "Heuristic evaluation from measurable text signals (word count, proper-noun density, presence of dates/numbers, superlatives) — not LLM-verified.",
      };
    })
    .filter((item) => item.score >= 0.55 && !containsPlaceholder(item.fact));
}
