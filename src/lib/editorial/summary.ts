import { getCachedStage, setCachedStage } from "./cache";
import type { TopicKnowledge } from "@/types/wiki";

export async function generateEditorialBrief(
  topicKey: string,
  knowledge: TopicKnowledge
): Promise<string> {
  const cached = await getCachedStage(topicKey, "summary");
  if (cached) return (cached as { shortSummary: string }).shortSummary;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return `${knowledge.description}. This crucial topic has shaped historical, cultural, and scientific contexts.`;

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a Senior Editor. Write a polished, premium editorial brief explaining why the topic matters and why the reader should care.
Topic: ${knowledge.title}
Subtitle: ${knowledge.description}
Category: ${knowledge.category}

Key structured facts about the topic (write only from these facts):
${knowledge.summaryFacts.map(f => `- ${f}`).join("\n")}
Key themes:
${knowledge.themes.map(t => `- ${t}`).join("\n")}

Requirements:
1. Word count: 120-150 words.
2. The first sentence MUST explain immediately why this topic matters.
3. Never begin with '{topic} is', '{topic} was', 'The {topic} is', or equivalent robotic definition. Start with immediate insight.
4. Avoid citations, bracket dates, pronunciations, parentheses unless absolutely necessary.
5. Finish by explaining why this topic still matters today.
6. Avoid robotic AI terminology (do not use: represents, illustrates, highlights, demonstrates, trajectory, conceptual, thematic, in conclusion, overall, furthermore, additionally).

Return valid JSON matching this schema:
{
  "shortSummary": "Editorial brief text"
}

Do not return any markdown wrappers. Start with { and end with }.`;

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
    return `${knowledge.description}. This crucial topic has shaped historical, cultural, and scientific contexts.`;
  }
}
