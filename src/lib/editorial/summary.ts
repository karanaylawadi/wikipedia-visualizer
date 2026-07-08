import { getCachedStage, setCachedStage } from "./cache";
import type { TopicKnowledge } from "@/types/wiki";

export function getDomainSummaryPrompt(knowledge: TopicKnowledge): string {
  const type = knowledge.entityType;
  let focusInstruction = "";

  if (type === "Movie" || type === "TV Series") {
    const data = knowledge.movieData || { director: "", genre: "" };
    focusInstruction = `Focus on the film's cinematic significance, genre boundaries, directorial choices by ${data.director || "directors"}, core thematic motifs, and critical pop-culture reception. Do not reveal late plot spoilers.`;
  } else if (type === "Person" || type === "Musical Artist") {
    const data = knowledge.personData || { occupation: "" };
    focusInstruction = `Focus on the subject's biographical trajectory, their primary role as ${data.occupation || "individuals"}, the pivotal contributions they made to their field, obstacles faced, and their lasting posthumous reputation.`;
  } else if (type === "Company" || type === "Brand") {
    const data = knowledge.companyData || { founder: "", industry: "" };
    focusInstruction = `Focus on the enterprise's founding by ${data.founder || "founders"}, their industry growth, key product line innovations, business model sustainability, and current corporate leadership/strategy.`;
  } else if (type === "Historical Event" || type === "War" || type === "Empire" || type === "Civilization" || type === "Space Mission") {
    focusInstruction = `Focus on the event's underlying causes, major chronological campaigns/events, the key historical treaties/commanders, geographical impacts, and long-term socio-political fallout and lessons.`;
  } else if (type === "Country" || type === "City") {
    const data = knowledge.countryData || { capital: "" };
    focusInstruction = `Focus on the geopolitical profile of the region, its historical foundations, geographic layout, demographic structure, economic drivers, and modern global/continental positioning.`;
  } else if (type === "Book" || type === "Video Game" || type === "Artwork" || type === "Album" || type === "Song") {
    const data = knowledge.bookData || { author: "", genre: "" };
    focusInstruction = `Focus on the work's creation by ${data.author || "artists"}, its plot/artistic format, core metaphors and symbols explored, the aesthetic/critical reception upon release, and literary/pop-cultural legacy.`;
  } else if (type === "Technology" || type === "Programming Language") {
    const data = knowledge.technologyData || { inventor: "" };
    focusInstruction = `Focus on the computing or technological system's creation, the technical problems it was designed to resolve, core architectural design patterns, adoption curves, and current roadmap challenges.`;
  } else {
    focusInstruction = `Focus on the scientific concept's discovery, the underlying mechanism/equations, real-world technological or research applications, boundaries of the theory, and future research directives.`;
  }

  return `You are a Senior Editor. Write a polished, premium editorial brief explaining why the topic matters and why the reader should care.
Topic: ${knowledge.common.title}
Subtitle: ${knowledge.common.description}
Category: ${knowledge.entityType}

Key facts:
${knowledge.common.summaryFacts.map(f => `- ${f}`).join("\n")}

Focus Area:
${focusInstruction}

Requirements:
1. Word count: 120-150 words.
2. The first sentence MUST explain immediately why this topic matters.
3. Never begin with '{topic} is', '{topic} was', 'The {topic} is', or equivalent robotic definition. Start with immediate insight.
4. Avoid citations, bracket dates, pronunciations, parentheses.
5. Finish by explaining why this topic still matters today.
6. Avoid robotic AI terminology (do not use: represents, illustrates, highlights, demonstrates, trajectory, conceptual, thematic, in conclusion, overall, furthermore, additionally).

Return valid JSON matching this schema:
{
  "shortSummary": "Editorial brief text"
}
Do not return any markdown wrappers. Start with { and end with }.`;
}

export async function generateEditorialBrief(
  topicKey: string,
  knowledge: TopicKnowledge
): Promise<string> {
  const cached = await getCachedStage(topicKey, "summary");
  if (cached) return (cached as { shortSummary: string }).shortSummary;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return `${knowledge.common.description}. This crucial topic has shaped historical, cultural, and scientific contexts.`;

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = getDomainSummaryPrompt(knowledge);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.3, maxOutputTokens: 300 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { shortSummary: string };
    const summary = parsed.shortSummary || "";
    await setCachedStage(topicKey, "summary", parsed);
    return summary;
  } catch (error) {
    console.warn("Editorial Brief generation failed, returning fallback", error);
    return `${knowledge.common.description}. This crucial topic has shaped historical, cultural, and scientific contexts.`;
  }
}
