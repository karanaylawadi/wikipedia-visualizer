import { getCachedStage, setCachedStage } from "./cache";
import type { StructuredFacts } from "./facts";
import type { Classification } from "./classifier";

export interface CardPlan {
  readerQuestion: string;
  perspectiveTitle: string;
  referenceLabel: string;
  factsToUse: string;
  factsToAvoid: string;
}

export async function createEditorialPlan(
  topicKey: string,
  structuredFacts: StructuredFacts,
  classification: Classification
): Promise<{ cards: CardPlan[] }> {
  const cached = await getCachedStage(topicKey, "stage3-plan");
  if (cached) return cached as { cards: CardPlan[] };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { cards: [] };

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a Senior Editorial Director. Design the editorial outline of 5 chronological narrative chapters for this topic to make it feel like a National Geographic or New York Times documentary.
Topic: ${structuredFacts.title}
Category: ${classification.category} (${classification.subcategory})
Reader Intent: ${classification.readerIntent}

Select exactly 5 dynamic, custom chapter labels (referenceLabel) and active headlines (perspectiveTitle, 2-5 words) that sequentially tell the story of the topic.
Adapt to this strict chronological storyline structure:
- Chapter 1 (What started this?): Custom chapter label (e.g. "Birth of an Empire", "Cold War Begins").
- Chapter 2 (What changed everything?): Custom chapter label (e.g. "Augustus Changes Rome", "Sputnik Shock").
- Chapter 3 (Who were the key people?): Custom chapter label (e.g. "Race to the Moon", "Building the Giant").
- Chapter 4 (What happened next?): Custom chapter label (e.g. "Crisis & Decline", "Technology Beyond Space").
- Chapter 5 (Why does it still matter?): Custom chapter label (e.g. "Fall of the West", "Lasting Legacy").

Requirements:
1. Never use generic chapter labels like 'Origins', 'Dynamics', 'Evolution', 'Legacy', 'Significance', 'Overview', 'History', 'Background', 'Developments'.
2. Custom chapter labels (referenceLabel) must be specific to the subject (e.g. "Sputnik Shock", "Maiden Voyage", "Early Dreams").
3. Chapter titles (perspectiveTitle) must be active magazine headlines (max 5 words).
4. Ensure zero overlap in facts or details planned between chapters.

Return valid JSON matching this schema:
{
  "cards": [
    {
      "readerQuestion": "The exact storyline question mapping to this chapter (e.g. 'What started this?')",
      "perspectiveTitle": "Headline, 2-5 words (e.g. 'Sputnik Crosses the Night Sky')",
      "referenceLabel": "Custom subject-specific chapter label, 2-5 words (e.g. 'Sputnik Shock')",
      "factsToUse": "Comma-separated list of facts unique to this perspective",
      "factsToAvoid": "Comma-separated list of facts to avoid to prevent duplicate overlap with other perspectives"
    }
  ]
}

Return exactly 5 cards. Do not return any markdown wrappers. Start with { and end with }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.2, maxOutputTokens: 600 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { cards: CardPlan[] };
    await setCachedStage(topicKey, "stage3-plan", parsed);
    return parsed;
  } catch (error) {
    console.warn("Stage 3 Editorial Planning failed", error);
    return { cards: [] };
  }
}
