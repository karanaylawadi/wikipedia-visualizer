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

    const prompt = `You are a Fact Curator. Generate exactly three surprising, memorable, and independently verifiable facts about the topic.
Topic: ${structuredFacts.title}
Context:
${structuredFacts.extractSummary}

Requirements:
1. Return exactly three facts.
2. Each fact must be under 18 words.
3. Facts should make readers smile (e.g. funny trivia, bizarre coincidences, unique features). Avoid boring general statements like 'The Roman Empire influenced history.'

Return valid JSON matching this schema:
{
  "didYouKnow": [
    "Fact 1 under 18 words",
    "Fact 2 under 18 words",
    "Fact 3 under 18 words"
  ]
}

Do not return any markdown wrappers. Start with { and end with }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.4, maxOutputTokens: 250 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { didYouKnow: string[] };
    const facts = parsed.didYouKnow || [];
    await setCachedStage(topicKey, "stage6-didyouknow", parsed);
    return facts;
  } catch (error) {
    console.warn("Stage 6 Curation failed", error);
    return [
      `${structuredFacts.title} continues to influence research in its respective field.`,
      `Records of ${structuredFacts.title} show unique milestones.`,
      `Early findings regarding ${structuredFacts.title} were widely discussed.`
    ];
  }
}
