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

    const prompt = `You are a Magazine Staff Writer. Write a single analysis perspective card matching these exact directions.
Topic: ${structuredFacts.title}
Perspective Title: ${cardPlan.perspectiveTitle}
Perspective Label: ${cardPlan.referenceLabel}
Reader Question: ${cardPlan.readerQuestion}
Facts to include: ${cardPlan.factsToUse}
Facts to avoid: ${cardPlan.factsToAvoid}

Context Facts:
${structuredFacts.extractSummary}

Factual Overlap Prevention (Do not repeat these details from previous perspectives):
${factsAlreadyUsed || "No previous perspectives written yet."}

Requirements:
1. Summary must be 80-100 words (strict maximum 120 words).
2. Write like an article, not encyclopedic lists.
3. Card headline/title must be 2-5 words. Never exceed 5 words.
4. Card summary must not start with the topic name or robotic definitions (e.g. no "The [Topic] was...").
5. The card summary must directly answer the assigned reader question.
6. The keyTakeaway must be under 18 words.
7. Avoid AI robotic terms (do not use: represents, illustrates, highlights, demonstrates, trajectory, conceptual, thematic, in conclusion, overall, furthermore, additionally, this crucial perspective).

Return valid JSON matching this schema:
{
  "title": "Editorial headline, 2-5 words",
  "referenceLabel": "Label, 1-3 words",
  "readerQuestion": "Reader question answered",
  "summary": "Editorial card content text (80-100 words)",
  "keyTakeaway": "Takeaway summary sentence (max 18 words)"
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
