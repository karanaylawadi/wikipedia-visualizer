import type { ResolvedEntity, NarrativePlan, NarrativeChapter, FactScript, FactScriptChapter, EvaluatedFact } from "@/types/knowledge";
import type { CompiledOutput } from "./compiler";

export async function generateFactScript(
  resolved: ResolvedEntity,
  compiled: CompiledOutput,
  rankedFacts: EvaluatedFact[],
  plan: NarrativePlan
): Promise<FactScript> {
  const apiKey = process.env.GEMINI_API_KEY;
  const chapters: FactScriptChapter[] = [];

  for (let i = 0; i < plan.chapters.length; i++) {
    const chapter = plan.chapters[i];
    if (!apiKey) {
      chapters.push(getFallbackChapterScript(resolved, compiled, chapter, i));
      continue;
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are a Lead Fact-Checking Producer.
Your job is to build a Fact Script for a documentary chapter based ONLY on the provided compiled facts and timeline.
Absolutely NO prose, sentences, or paragraphs should be in the fields other than cause, effect, and takeaway. 
The lists of entities, dates, locations, people, events, keyFacts, connections, and quotes MUST be short, raw factual bullet strings, NOT full grammatical sentences.

Topic: "${resolved.canonicalTitle}"
Ontology Type: "${resolved.entityType}"
Chapter title: "${chapter.title}"
Chapter Reader Question: "${chapter.readerQuestion}"
Chapter Objectives: ${JSON.stringify(chapter.objectives)}
Chapter Approved Facts: ${JSON.stringify(chapter.approvedFacts)}

All Compiled Facts: ${JSON.stringify(compiled.structuredFacts)}
All Timeline Events: ${JSON.stringify(compiled.timeline)}
All Named Entities: ${JSON.stringify(compiled.namedEntities.map(e => e.name))}

Return a valid JSON object matching this schema:
{
  "chapterTitle": "${chapter.title}",
  "questionAnswered": "${chapter.readerQuestion}",
  "chronologicalPosition": ${i + 1},
  "entities": ["string - specific named entity keywords related to this chapter"],
  "dates": ["string - dates/years relevant to this chapter's story"],
  "locations": ["string - physical locations mentioned"],
  "people": ["string - key people involved"],
  "events": ["string - specific events, wars, battles, or product releases"],
  "cause": "string - 1 short sentence summarizing the primary cause/motivating spark of these facts",
  "effect": "string - 1 short sentence summarizing the primary outcome/consequence of these facts",
  "keyFacts": ["string - 3 to 5 highly specific factual bullet points covering the chapter objectives and approved facts"],
  "quotes": ["string - 1 or 2 historical or illustrative quotes if available, otherwise empty list"],
  "connections": ["string - 1 or 2 specific connections/links to other chapters or related topics"],
  "takeaway": "string - 1 concise takeaway sentence (max 10 words)"
}

Only return raw JSON. Start with { and end with }. Do not wrap in markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.1, maxOutputTokens: 1000 }
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      const parsed = JSON.parse(text) as FactScriptChapter;
      
      chapters.push({
        chapterTitle: parsed.chapterTitle || chapter.title,
        questionAnswered: parsed.questionAnswered || chapter.readerQuestion,
        chronologicalPosition: i + 1,
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        dates: Array.isArray(parsed.dates) ? parsed.dates : [],
        locations: Array.isArray(parsed.locations) ? parsed.locations : [],
        people: Array.isArray(parsed.people) ? parsed.people : [],
        events: Array.isArray(parsed.events) ? parsed.events : [],
        cause: parsed.cause || "",
        effect: parsed.effect || "",
        keyFacts: Array.isArray(parsed.keyFacts) && parsed.keyFacts.length > 0 ? parsed.keyFacts : chapter.approvedFacts,
        quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
        connections: Array.isArray(parsed.connections) ? parsed.connections : [],
        takeaway: parsed.takeaway || ""
      });
    } catch (error) {
      console.warn(`generateFactScript failed for chapter ${i}, using fallback`, error);
      chapters.push(getFallbackChapterScript(resolved, compiled, chapter, i));
    }
  }

  return { chapters };
}

function getFallbackChapterScript(
  resolved: ResolvedEntity,
  compiled: CompiledOutput,
  chapter: NarrativeChapter,
  index: number
): FactScriptChapter {
  const years = compiled.timeline.map(t => t.year).filter(Boolean);
  const matchedEntities = compiled.namedEntities
    .filter(e => chapter.anchors.some(a => a.toLowerCase().includes(e.name.toLowerCase())))
    .map(e => e.name);

  let cause = "";
  let effect = "";
  let takeaway = "";

  if (index === 0) {
    cause = `motivating factors behind early phases of development`;
    effect = `initial events showing transition in the subject`;
    takeaway = `fundamental lessons from this period`;
  } else if (index === 1) {
    cause = `key drivers behind the rising influence`;
    effect = `consequent progress seen during this phase`;
    takeaway = `primary insights on the rise`;
  } else if (index === 2) {
    cause = `pivotal elements supporting the peak achievements`;
    effect = `resultant breakthroughs related directly to these successes`;
    takeaway = `core takeaways regarding this era`;
  } else if (index === 3) {
    cause = `underlying issues prompting the challenges faced`;
    effect = `resulting shifts that defined the response taken`;
    takeaway = `crucial lessons on these struggles`;
  } else {
    cause = `lasting forces establishing the legacy left behind`;
    effect = `long-term outcomes that shaped the memory of the subject`;
    takeaway = `final summary explaining the legacy`;
  }

  return {
    chapterTitle: chapter.title,
    questionAnswered: chapter.readerQuestion,
    chronologicalPosition: index + 1,
    entities: matchedEntities.length > 0 ? matchedEntities : chapter.anchors,
    dates: years.slice(index, index + 2),
    locations: [],
    people: [],
    events: [],
    cause,
    effect,
    keyFacts: chapter.approvedFacts,
    quotes: [],
    connections: [],
    takeaway
  };
}
