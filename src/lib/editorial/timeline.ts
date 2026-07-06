import { getCachedStage, setCachedStage } from "./cache";
import type { StructuredFacts } from "./facts";
import type { Classification } from "./classifier";

export interface TimelineMilestone {
  year: string;
  event: string;
}

export async function extractTimeline(
  topicKey: string,
  structuredFacts: StructuredFacts,
  classification: Classification
): Promise<TimelineMilestone[] | null> {
  const cached = await getCachedStage(topicKey, "stage12-timeline");
  if (cached) return (cached as { timeline: TimelineMilestone[] | null }).timeline;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const category = classification.category.toLowerCase();
  const subcategory = classification.subcategory.toLowerCase();

  const isChronologyRelevant =
    category.includes("empire") ||
    category.includes("event") ||
    category.includes("war") ||
    category.includes("battle") ||
    category.includes("mission") ||
    category.includes("period") ||
    category.includes("history") ||
    category.includes("person") ||
    category.includes("figure") ||
    subcategory.includes("history") ||
    structuredFacts.importantDates.length > 2;

  if (!isChronologyRelevant) {
    await setCachedStage(topicKey, "stage12-timeline", { timeline: null });
    return null;
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a Chronology Historian. Extract a compact timeline of key chronological milestones for this topic.
Topic: ${structuredFacts.title}
Important dates found: ${structuredFacts.importantDates.join(", ")}
Context extract:
${structuredFacts.extractSummary}

Requirements:
1. Extract a maximum of 8 critical milestones.
2. Order them strictly in ascending chronological order.
3. For each milestone, return the year/date (e.g. '753 BC', '1945') and a short event description (max 8 words).

Return valid JSON with this exact schema:
{
  "timeline": [
    { "year": "e.g. 509 BC", "event": "e.g. Roman Republic founded" }
  ]
}

Do not return any markdown wrappers. Start with { and end with }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.1, maxOutputTokens: 300 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { timeline: TimelineMilestone[] };
    const timeline = Array.isArray(parsed.timeline) ? parsed.timeline.slice(0, 8) : [];
    await setCachedStage(topicKey, "stage12-timeline", { timeline });
    return timeline;
  } catch (error) {
    console.warn("Timeline Extraction failed", error);
    await setCachedStage(topicKey, "stage12-timeline", { timeline: null });
    return null;
  }
}
