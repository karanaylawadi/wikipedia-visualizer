import { getCachedStage, setCachedStage } from "./cache";
import type { TopicKnowledge } from "@/types/wiki";
import { getMoviePlannerPrompt } from "./planner/moviePlanner";
import { getHistoryPlannerPrompt } from "./planner/historyPlanner";
import { getPersonPlannerPrompt } from "./planner/personPlanner";
import { getTechnologyPlannerPrompt } from "./planner/technologyPlanner";
import { getCompanyPlannerPrompt } from "./planner/companyPlanner";
import { getSciencePlannerPrompt } from "./planner/sciencePlanner";
import { getBookPlannerPrompt } from "./planner/bookPlanner";
import { getCountryPlannerPrompt } from "./planner/countryPlanner";
import { getOrganizationPlannerPrompt } from "./planner/organizationPlanner";

export interface CardPlan {
  readerQuestion: string;
  perspectiveTitle: string;
  referenceLabel: string;
  factsToUse: string;
  factsToAvoid: string;
}

function getDomainPrompt(knowledge: TopicKnowledge): string {
  const type = knowledge.entityType;
  if (type === "Movie" || type === "TV Series" || type === "Artwork" || type === "Album" || type === "Song") {
    return getMoviePlannerPrompt(knowledge);
  }
  if (type === "Book" || type === "Video Game") {
    return getBookPlannerPrompt(knowledge);
  }
  if (type === "Person" || type === "Musical Artist") {
    return getPersonPlannerPrompt(knowledge);
  }
  if (type === "Historical Event" || type === "War" || type === "Empire" || type === "Civilization" || type === "Space Mission") {
    return getHistoryPlannerPrompt(knowledge);
  }
  if (type === "Country" || type === "City") {
    return getCountryPlannerPrompt(knowledge);
  }
  if (type === "Company" || type === "Brand") {
    return getCompanyPlannerPrompt(knowledge);
  }
  if (type === "Organization") {
    return getOrganizationPlannerPrompt(knowledge);
  }
  if (type === "Technology" || type === "Programming Language") {
    return getTechnologyPlannerPrompt(knowledge);
  }
  return getSciencePlannerPrompt(knowledge);
}

export async function createEditorialPlan(
  topicKey: string,
  knowledge: TopicKnowledge
): Promise<{ cards: CardPlan[] }> {
  const cached = await getCachedStage(topicKey, "plan");
  if (cached) return cached as { cards: CardPlan[] };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { cards: [] };

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = getDomainPrompt(knowledge);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.2, maxOutputTokens: 1000 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { cards: CardPlan[] };
    await setCachedStage(topicKey, "plan", parsed);
    return parsed;
  } catch (error) {
    console.warn("Stage 3 Editorial Planning failed", error);
    return { cards: [] };
  }
}
