import { getCachedStage, setCachedStage } from "./cache";
import type { StructuredFacts } from "./facts";

export async function curateSurprisingFacts(
  topicKey: string,
  structuredFacts: StructuredFacts
): Promise<string[]> {
  const cached = await getCachedStage(topicKey, "stage6-didyouknow");
  if (cached) return (cached as { didYouKnow: string[] }).didYouKnow;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return [
      `${structuredFacts.title} continues to attract historical research globally.`,
      `The first chronicles of ${structuredFacts.title} outline key developments.`,
      `Key records of ${structuredFacts.title} show massive societal transformations.`
    ];
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a Fact Curator. Generate exactly five surprising, highly memorable, and independently verifiable facts about the topic.
Topic: ${structuredFacts.title}
Context:
${structuredFacts.extractSummary}

Requirements:
1. Return exactly five facts.
2. Each fact must be under 18 words (strict maximum 17 words).
3. Facts must be highly memorable, shareable, and surprising (e.g. unique trivia, weird rules, bizarre coincidences). Reject obvious statements.

Return valid JSON matching this schema:
{
  "didYouKnow": [
    "Fact 1 under 18 words",
    "Fact 2 under 18 words",
    "Fact 3 under 18 words",
    "Fact 4 under 18 words",
    "Fact 5 under 18 words"
  ]
}

Do not return any markdown wrappers. Start with { and end with }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.4, maxOutputTokens: 300 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { didYouKnow: string[] };
    const facts = parsed.didYouKnow || [];
    await setCachedStage(topicKey, "stage6-didyouknow", parsed);
    return facts;
  } catch (error) {
    console.warn("Stage 6 Curation failed", error);
    return [
      `${structuredFacts.title} was documented in historical and encyclopedic records.`,
      `Key findings regarding ${structuredFacts.title} reveal highly unique traits.`,
      `Scholarly works on ${structuredFacts.title} outline its global footprint.`,
      `Pivotal developments for ${structuredFacts.title} occurred over several decades.`,
      `Researchers continue to analyze the long-term impact of ${structuredFacts.title}.`
    ];
  }
}
