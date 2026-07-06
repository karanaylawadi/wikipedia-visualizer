import { getCachedStage, setCachedStage } from "./cache";
import type { StructuredFacts } from "./facts";

export interface Classification {
  category: string;
  subcategory: string;
  confidence: number;
  readerIntent: string;
  editorialStyle: string;
}

export async function classifyTopic(
  topicKey: string,
  structuredFacts: StructuredFacts
): Promise<Classification> {
  const cached = await getCachedStage(topicKey, "stage2-classification");
  if (cached) return cached as Classification;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      category: "General",
      subcategory: "General",
      confidence: 1.0,
      readerIntent: "General knowledge briefing",
      editorialStyle: "Narrative explainer",
    };
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert taxonomist. Classify the following topic into the single most appropriate primary type from:
Historical Empire, Historical Event, Country, City, Region, Landmark, Architecture, Painting, Artwork, Artist, Scientist, Inventor, Technology, Scientific Concept, Movie, TV Series, Book, Video Game, Company, Brand, Sports Team, Person, Political Figure, Animal, Plant, Food, Music Album, Song, Religion, Mythology, Space Mission, Space Object, Programming Language, Operating System, Disease, Medicine, Chemical Element.

Topic Title: ${structuredFacts.title}
Subtitle: ${structuredFacts.subtitle}
Lead Paragraph: ${structuredFacts.leadParagraph}
Categories: ${structuredFacts.categories.join(", ")}

Return valid JSON with this exact schema:
{
  "category": "The selected primary type from the list above.",
  "subcategory": "e.g. Ancient Civilization, Space Program, etc.",
  "confidence": 0.95,
  "readerIntent": "Short description of what a curious reader wants to understand in 5 minutes.",
  "editorialStyle": "Recommended narrative style."
}

Do not return any markdown wrappers. Start with { and end with }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.1, maxOutputTokens: 150 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as Classification;
    await setCachedStage(topicKey, "stage2-classification", parsed);
    return parsed;
  } catch (error) {
    console.warn("Category Classification failed, returning general fallback", error);
    return {
      category: "General",
      subcategory: "General",
      confidence: 0.5,
      readerIntent: "General knowledge briefing",
      editorialStyle: "Narrative explainer",
    };
  }
}
