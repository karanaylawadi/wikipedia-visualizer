import { getCachedStage, setCachedStage } from "./cache";
import type { StructuredFacts } from "./facts";
import type { CardPlan } from "./planner";

export interface PerspectiveCard {
  title: string;
  summary: string;
  referenceLabel: string;
  readerQuestion: string;
  keyTakeaway?: string | null;
}

export async function generatePerspectiveCard(
  topicKey: string,
  cardIndex: number,
  cardPlan: CardPlan,
  structuredFacts: StructuredFacts,
  factsAlreadyUsed: string
): Promise<PerspectiveCard> {
  const cached = await getCachedStage(topicKey, `stage4-card-${cardIndex}`);
  if (cached) return cached as PerspectiveCard;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      title: cardPlan.perspectiveTitle,
      referenceLabel: cardPlan.referenceLabel,
      readerQuestion: cardPlan.readerQuestion,
      summary: `Exploring key dynamics regarding ${cardPlan.perspectiveTitle.toLowerCase()} and its legacy.`,
      keyTakeaway: `Core lesson of ${cardPlan.referenceLabel.toLowerCase()}.`
    };
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert journalist and editor for National Geographic or The New York Times. Write a single narrative chapter card for a documentary-style briefing.
Topic: ${structuredFacts.title}
Chapter Label: ${cardPlan.referenceLabel}
Storyline Question to Answer: ${cardPlan.readerQuestion}
Headline: ${cardPlan.perspectiveTitle}
Facts to include: ${cardPlan.factsToUse}
Facts to avoid: ${cardPlan.factsToAvoid}

Context Facts:
${structuredFacts.extractSummary}

Factual Overlap Prevention (Do not repeat these details or sentences):
${factsAlreadyUsed || "No previous chapters written yet."}

Requirements:
1. Narrative summary must be exactly 70-90 words (strict maximum 95 words).
2. Write in a gripping, premium storytelling style. Every chapter must open with an engaging narrative sentence (e.g., "Everything changed in October 1957 when Sputnik crossed the night sky" instead of "The Space Race began during the Cold War").
3. NEVER start with robotic definition starts (e.g. do NOT write "X is...", "The X was...", "X was a...", "X has been...").
4. Directly answer the assigned storyline question.
5. Key takeaway must be a highly specific editorial lesson under 18 words.
6. Strictly avoid repetitive AI writing and boilerplate templates. Do not use these forbidden phrases:
   - "It played an important role..."
   - "It remains significant..."
   - "It influenced many..."
   - "It continues today..."
   - "This marked a turning point..."
   - represents, illustrates, highlights, demonstrates, trajectory, conceptual, thematic, in conclusion, overall, furthermore, additionally.

Return valid JSON matching this schema:
{
  "title": "Editorial headline, 2-5 words",
  "referenceLabel": "Custom chapter label, 2-5 words",
  "readerQuestion": "Storyline question answered",
  "summary": "Narrative paragraph text (70-90 words)",
  "keyTakeaway": "Editorial takeaway (max 18 words)"
}

Do not return any markdown wrappers. Start with { and end with }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.3, maxOutputTokens: 400 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as PerspectiveCard;
    await setCachedStage(topicKey, `stage4-card-${cardIndex}`, parsed);
    return parsed;
  } catch (error) {
    console.warn(`Card ${cardIndex} generation failed, returning fallback`, error);
    return {
      title: cardPlan.perspectiveTitle,
      referenceLabel: cardPlan.referenceLabel,
      readerQuestion: cardPlan.readerQuestion,
      summary: `Exploring key thematic aspects regarding ${cardPlan.referenceLabel.toLowerCase()} and its conceptual milestones.`,
      keyTakeaway: `Key insight on ${cardPlan.referenceLabel.toLowerCase()}.`
    };
  }
}
