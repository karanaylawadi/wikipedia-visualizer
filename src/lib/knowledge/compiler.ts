import type { ResolvedEntity, NamedEntity, TimelineEvent } from "@/types/knowledge";
import type { ArticleIntelligence } from "@/lib/editorial/wikipedia";
import { mapEntityTypeToOntology } from "../ontology/ontologyEngine";

export interface CompiledOutput {
  structuredFacts: Record<string, any>;
  namedEntities: NamedEntity[];
  timeline: TimelineEvent[];
  triviaCandidates: string[];
  relatedTopics: string[];
  sourceSections: Array<{ title: string; content: string }>;
}

export async function compileKnowledge(
  resolved: ResolvedEntity,
  article: ArticleIntelligence
): Promise<CompiledOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  const ontology = mapEntityTypeToOntology(resolved.entityType);

  if (!apiKey) {
    // Fallback compilation
    return getFallbackCompilation(resolved, article);
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const requiredFieldsInstructions = ontology.requiredFields
    .map(field => `- ${field}: Extract the exact details for this field. (No prose summaries, just specific facts, names, numbers or lists)`)
    .join("\n");

  const prompt = `You are a Precise Knowledge Compiler. Your job is to parse Wikipedia article data and compile it into a strict, ontology-specific structured knowledge representation.
Do NOT generate prose or summaries. Compile only raw structured facts.

Topic: "${resolved.canonicalTitle}"
Ontology Type: "${ontology.name}"
Aliases: ${JSON.stringify(resolved.aliases)}

Wikipedia Article Content:
Lead: "${article.lead}"
Extract: "${article.extract.slice(0, 8000)}"

Please extract and compile the following fields for the "${ontology.name}" ontology:
${requiredFieldsInstructions}

Also extract:
1. "timeline": Between ${ontology.timelineSchema.minEvents} and ${ontology.timelineSchema.maxEvents} major chronological milestones. Format: [{"year": "year string", "event": "concise description of event (max 8 words)"}].
2. "triviaCandidates": Exactly 8-10 highly surprising, concrete, specific facts or pieces of trivia.
3. "namedEntities": Key people, locations, organizations, or concepts mentioned in the text. Format: [{"name": "entity name", "type": "Person/Place/Org/Concept", "description": "brief 1-sentence identification"}].
4. "relatedTopics": List of up to 10 canonical titles of related topics.
5. "sourceSections": List of sections in the article. For each, include "title" (heading) and "content" (brief bullet points of 2-4 key facts).

Return a valid JSON object matching this schema:
{
  "structuredFacts": {
    // compiled ontology fields as defined above
  },
  "timeline": [
    {"year": "string", "event": "string"}
  ],
  "triviaCandidates": [
    "string"
  ],
  "namedEntities": [
    {"name": "string", "type": "string", "description": "string"}
  ],
  "relatedTopics": [
    "string"
  ],
  "sourceSections": [
    {"title": "string", "content": "string"}
  ]
}

Only return raw JSON. Start with { and end with }. Do not wrap in markdown.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.1, maxOutputTokens: 2500 }
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as CompiledOutput;
    
    // Validate schema basic fields exist
    parsed.structuredFacts = parsed.structuredFacts || {};
    parsed.timeline = parsed.timeline || [];
    parsed.triviaCandidates = parsed.triviaCandidates || [];
    parsed.namedEntities = parsed.namedEntities || [];
    parsed.relatedTopics = parsed.relatedTopics || [];
    parsed.sourceSections = parsed.sourceSections || [];

    return parsed;
  } catch (error) {
    console.warn("compileKnowledge failed, falling back to heuristic compiler", error);
    return getFallbackCompilation(resolved, article);
  }
}

function getFallbackCompilation(resolved: ResolvedEntity, article: ArticleIntelligence): CompiledOutput {
  const ontology = mapEntityTypeToOntology(resolved.entityType);
  const structuredFacts: Record<string, any> = {};

  // Simple fallbacks for required fields
  for (const field of ontology.requiredFields) {
    if (field === "cast" || field === "themes" || field === "artists" || field === "majorWorks" || field === "techniques") {
      structuredFacts[field] = ["Significant Item 1", "Significant Item 2"];
    } else {
      structuredFacts[field] = `Compiled detail for ${field}`;
    }
  }

  const paragraphs = article.extract.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const timeline: TimelineEvent[] = [];
  const years = Array.from(new Set(article.extract.match(/\b(1\d{3}|2\d{3})\b/g) || [])).slice(0, 6);
  years.forEach((yr, idx) => {
    timeline.push({
      year: yr,
      event: `Significant milestone event ${idx + 1}`
    });
  });

  if (timeline.length < ontology.timelineSchema.minEvents) {
    timeline.push({ year: "Modern Era", event: "Ongoing development and modern observation" });
  }

  return {
    structuredFacts,
    namedEntities: [
      { name: resolved.canonicalTitle, type: "Concept", description: "The primary resolved subject." }
    ],
    timeline,
    triviaCandidates: paragraphs.slice(0, 5),
    relatedTopics: article.links.slice(0, 8).map(l => l.title),
    sourceSections: article.sectionHeadings.slice(0, 4).map(h => ({
      title: h,
      content: `Extracted key facts under the section ${h}.`
    }))
  };
}
