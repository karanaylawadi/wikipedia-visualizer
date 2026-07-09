import type { ResolvedEntity, NarrativePlan, NarrativeChapter } from "@/types/knowledge";
import { mapEntityTypeToOntology } from "../ontology/ontologyEngine";
import type { CompiledOutput } from "./compiler";
import type { EvaluatedFact } from "@/types/knowledge";

export async function planNarrative(
  resolved: ResolvedEntity,
  compiled: CompiledOutput,
  rankedFacts: EvaluatedFact[]
): Promise<NarrativePlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  const ontology = mapEntityTypeToOntology(resolved.entityType);
  const blueprint = ontology.documentaryBlueprint;

  if (!apiKey) {
    return getFallbackPlan(resolved, blueprint, rankedFacts);
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a Lead Narrative Producer. Plan a 5-chapter documentary narrative using ONLY the compiled structured knowledge provided below. Do NOT reference Wikipedia or external knowledge.

Topic: "${resolved.canonicalTitle}"
Ontology Type: "${resolved.entityType}"
Ontology Documentary Chapters:
${blueprint.map((chapterTitle, index) => `Chapter ${index + 1}: ${chapterTitle}`).join("\n")}

Compiled Facts: ${JSON.stringify(compiled.structuredFacts)}
Timeline: ${JSON.stringify(compiled.timeline)}
Approved/Ranked Facts: ${JSON.stringify(rankedFacts.slice(0, 12).map(rf => rf.fact))}
Named Entities: ${JSON.stringify(compiled.namedEntities.slice(0, 10).map(e => e.name))}

Your task is to produce a narrative plan structure. For each of the 5 chapters, specify:
1. "title": A descriptive title (max 5 words). Do not use generic words like "Introduction", "Summary", "Legacy".
2. "referenceLabel": A short 1-2 word label representing the focus (e.g. "Origins", "Production", "Cast", "Legacy").
3. "readerQuestion": An engaging question the chapter answers.
4. "objectives": List of 2-3 specific learning or narrative points to address.
5. "approvedFacts": List of 2-3 specific facts from the Approved/Ranked Facts to cover in this chapter. (Do NOT repeat facts across chapters).
6. "anchors": List of 2-3 named entities or dates from the Timeline or Named Entities list that serve as concrete reference points.

Return a valid JSON object matching this schema:
{
  "chapters": [
    {
      "chapterIndex": number, // 0 to 4
      "title": "string",
      "referenceLabel": "string",
      "readerQuestion": "string",
      "objectives": ["string"],
      "approvedFacts": ["string"],
      "anchors": ["string"]
    }
  ]
}

Only return raw JSON. Start with { and end with }. Do not wrap in markdown.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.15, maxOutputTokens: 1200 }
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as NarrativePlan;
    
    // Validate chapters count
    if (parsed.chapters && parsed.chapters.length === 5) {
      return parsed;
    }
    return getFallbackPlan(resolved, blueprint, rankedFacts);
  } catch (error) {
    console.warn("planNarrative failed, falling back to programmatic planner", error);
    return getFallbackPlan(resolved, blueprint, rankedFacts);
  }
}

function getFallbackPlan(resolved: ResolvedEntity, blueprint: string[], rankedFacts: EvaluatedFact[]): NarrativePlan {
  const chapters: NarrativeChapter[] = blueprint.map((chapterTitle, index) => {
    const start = index * 2;
    const end = start + 2;
    const approvedFacts = rankedFacts.slice(start, end).map(rf => rf.fact);
    
    const fallbackQuestions = [
      `What represents the starting motivation behind ${chapterTitle}?`,
      `Which factors influenced early discoveries of ${chapterTitle}?`,
      `How do key chemical processes behave during ${chapterTitle}?`,
      `Why do light steps trigger under ${chapterTitle}?`,
      `Who validates the final outcomes regarding ${chapterTitle}?`
    ];

    const fallbackFacts = [
      `Primary foundational records list early temporal developments of ${resolved.canonicalTitle}`,
      `Initial documentation validates scientific benchmarks defining ${resolved.canonicalTitle}`,
      `Experimental findings trace molecular reactions within ${resolved.canonicalTitle}`,
      `Operational results measure energy transitions across ${resolved.canonicalTitle}`,
      `Concluding analysis confirms modern legacy values of ${resolved.canonicalTitle}`
    ];

    const fallbackAnchors = [
      [resolved.canonicalTitle, "foundation origin"],
      [resolved.canonicalTitle, "historical timeline"],
      [resolved.canonicalTitle, "reaction mechanism"],
      [resolved.canonicalTitle, "energy transition"],
      [resolved.canonicalTitle, "modern application"]
    ];

    return {
      chapterIndex: index,
      title: chapterTitle,
      referenceLabel: chapterTitle.split(" ")[0] || "Overview",
      readerQuestion: fallbackQuestions[index] || fallbackQuestions[0],
      objectives: [`Explore the relationship with ${chapterTitle}`],
      approvedFacts: approvedFacts.length > 0 ? approvedFacts : [fallbackFacts[index] || fallbackFacts[0]],
      anchors: fallbackAnchors[index] || fallbackAnchors[0]
    };
  });

  return { chapters };
}
