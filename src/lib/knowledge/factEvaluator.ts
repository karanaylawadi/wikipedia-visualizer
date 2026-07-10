import type { ResolvedEntity, EvaluatedFact, EvaluationMetrics } from "@/types/knowledge";
import type { CompiledOutput } from "./compiler";

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
  compiled: CompiledOutput
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
    return getFallbackEvaluation(candidateFacts);
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.1, maxOutputTokens: 2000 }
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { evaluations: EvaluatedFact[] };
    
    // Sort by overall score descending and filter out any with score < 0.65 or containing forbidden phrases
    const evaluated = (parsed.evaluations || [])
      .filter(item => item.score >= 0.65 && !isFactWeak(item.fact))
      .sort((a, b) => b.score - a.score);

    if (evaluated.length === 0) {
      return deduplicateEvaluatedFacts(getFallbackEvaluation(candidateFacts));
    }

    return deduplicateEvaluatedFacts(evaluated);
  } catch (error) {
    console.warn("evaluateFacts failed, using fallback metrics", error);
    return deduplicateEvaluatedFacts(getFallbackEvaluation(candidateFacts));
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

function getFallbackEvaluation(facts: string[]): EvaluatedFact[] {
  return facts.map((fact) => {
    const specificity = fact.match(/\b(1\d{3}|2\d{3}|\d+%|\$\d+)\b/) ? 0.9 : 0.6;
    const isWeak = isFactWeak(fact);
    const score = isWeak ? 0.5 : (specificity === 0.9 ? 0.85 : 0.7);
    
    return {
      fact,
      score,
      metrics: {
        confidence: 0.95,
        specificity,
        narrativeValue: 0.8,
        educationalValue: 0.8,
        visualValue: 0.7,
        uniqueness: 0.7,
        ontologyRelevance: 0.85
      },
      reasoning: isWeak ? "Fact contains generic or weak phrases." : "Standard programmatic metric evaluation."
    };
  }).filter(item => item.score >= 0.65);
}
