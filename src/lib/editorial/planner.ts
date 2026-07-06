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

    const prompt = `You are a Senior Editorial Director. Design the editorial outline of 5 analysis perspectives for this topic.
Topic: ${structuredFacts.title}
Category: ${classification.category} (${classification.subcategory})
Reader Intent: ${classification.readerIntent}

Select 5 completely unique reader questions and card titles (creative headlines, 2-5 words) that best explore this topic. Adapt to the relevant category framework:
- Historical Empire: Rise, Expansion, Government, Decline, Legacy
- Historical Event: Causes, Timeline, Turning Point, Consequences, Modern Impact
- Country: Identity, History, Culture, Economy, Tourism
- Movie: Story, Production, Cast, Reception, Awards
- Book: Story, Themes, Characters, Reception, Influence
- Scientist: Early Life, Discovery, Research, Recognition, Legacy
- Technology: Problem, Innovation, Applications, Limitations, Future
- Programming Language: History, Syntax, Ecosystem, Use Cases, Future
- Animal: Habitat, Behaviour, Diet, Conservation, Interesting Facts
- General: Origins, Key Dynamics, Evolution, Significance, Legacy

Requirements:
1. Ensure zero factual overlap between perspectives.
2. Perspective titles must be creative, active magazine headlines (max 5 words). Do not use generic headers like 'Overview', 'History', 'Legacy', 'Importance', 'Summary', 'Background', 'Origins', 'Developments'.

Return valid JSON matching this schema:
{
  "cards": [
    {
      "readerQuestion": "Distinct reader question (e.g. 'How did Rome govern?')",
      "perspectiveTitle": "Headline, 2-5 words (e.g. 'Engineering an Empire'). Do not use generic words.",
      "referenceLabel": "Label, 1-3 words (e.g. 'Governance')",
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
