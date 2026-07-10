import { getCachedStage, setCachedStage } from "./cache";
import type { TopicKnowledge } from "@/types/wiki";
import type { CardPlan } from "./planner";

export interface PerspectiveCard {
  title: string;
  summary: string;
  referenceLabel: string;
  readerQuestion: string;
  keyTakeaway: string;
}

export function getDomainCardPrompt(
  knowledge: TopicKnowledge,
  cardPlan: CardPlan,
  assignedFacts: { facts: string[]; anchors: string[] },
  factsAlreadyUsed: string
): string {
  const type = knowledge.entityType;
  let storytellingGuidelines = "";

  if (type === "Movie" || type === "TV Series") {
    storytellingGuidelines = `Write like a premium film critic or cultural journalist. Maintain a cinematic and analytical tone.
Avoid using biographical timeline starts or generic statements about historical significance. Focus on the art of film, screenwriting, directing style, and audience impact.`;
  } else if (type === "Person" || type === "Musical Artist") {
    storytellingGuidelines = `Write like a premium biographer. Focus on their human choices, career breakthroughs, peak creative contributions, obstacles, and lasting legacy.
Ensure the narrative flows chronologically as designed. Focus on the individual's character and agency.`;
  } else if (type === "Company" || type === "Brand") {
    storytellingGuidelines = `Write like a business journalist for Bloomberg or Forbes. Focus on industry forces, founding vision, market entry, product success, business models, and competition.`;
  } else if (type === "Historical Event" || type === "War" || type === "Empire" || type === "Civilization" || type === "Space Mission") {
    storytellingGuidelines = `Write like a premium historian. Focus on causes, massive campaigns, strategies, treaties, turning points, and geopolitical shifts.`;
  } else if (type === "Country" || type === "City") {
    storytellingGuidelines = `Write like a travel or geopolitical essayist. Focus on geographic landscapes, geopolitical sovereignty, economic engines, and modern cultural positioning.`;
  } else if (type === "Book" || type === "Video Game" || type === "Artwork" || type === "Album" || type === "Song") {
    storytellingGuidelines = `Write like a literary/art critic. Focus on narrative, aesthetics, creation context, and themes.`;
  } else if (type === "Technology" || type === "Programming Language") {
    storytellingGuidelines = `Write like a tech journalist. Focus on architecture, engineering decisions, problems solved, developer ecosystems, and roadmaps.`;
  } else {
    storytellingGuidelines = `Write like a science communicator. Focus on mechanisms, formulas, experimental evidence, applications, and current research frontiers.`;
  }

  return `You are an expert journalist and editor for National Geographic or The New York Times. Write a single narrative chapter card for a documentary-style briefing.
Topic: ${knowledge.common.title}
Chapter Label: ${cardPlan.referenceLabel}
Storyline Question to Answer: ${cardPlan.readerQuestion}
Headline: ${cardPlan.perspectiveTitle}

Storytelling Guidelines for Category "${knowledge.entityType}":
${storytellingGuidelines}

FACTS AND ANCHORS ASSIGNED TO THIS CHAPTER (Use ONLY these details; do not write about anything else):
- Facts: ${assignedFacts.facts.join("; ")}
- Anchors: ${assignedFacts.anchors.join("; ")}

Factual Overlap Prevention (Do not repeat these details or sentences from previous chapters):
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
}

export async function generatePerspectiveCard(
  topicKey: string,
  cardIndex: number,
  cardPlan: CardPlan,
  knowledge: TopicKnowledge,
  assignedFacts: { facts: string[]; anchors: string[] },
  factsAlreadyUsed: string
): Promise<PerspectiveCard> {
  const cached = await getCachedStage(topicKey, `chapter-${cardIndex}`);
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

    const prompt = getDomainCardPrompt(knowledge, cardPlan, assignedFacts, factsAlreadyUsed);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.3, maxOutputTokens: 400 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as PerspectiveCard;
    await setCachedStage(topicKey, `chapter-${cardIndex}`, parsed);
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
