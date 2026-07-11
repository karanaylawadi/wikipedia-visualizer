import type { ResolvedEntity, NarrativePlan, NarrativeChapter, FactScript, FactScriptChapter, EvaluatedFact, StageDiagnostic } from "@/types/knowledge";
import type { CompiledOutput } from "./compiler";
import { containsPlaceholder } from "./placeholderDetector";
import { recordFallback, recordGeminiSuccess, recordGeminiFailure } from "./diagnostics";
import { callGeminiModel } from "@/lib/ai/geminiConfig";

export async function generateFactScript(
  resolved: ResolvedEntity,
  compiled: CompiledOutput,
  rankedFacts: EvaluatedFact[],
  plan: NarrativePlan,
  diagnostics: StageDiagnostic[] = []
): Promise<FactScript> {
  const apiKey = process.env.GEMINI_API_KEY;
  const chapters: FactScriptChapter[] = [];

  for (let i = 0; i < plan.chapters.length; i++) {
    const chapter = plan.chapters[i];

    // A chapter narrativePlanner already marked insufficientData (no real
    // approved facts) cannot be honestly scripted — carry the flag forward
    // rather than attempt to invent cause/effect/takeaway for it.
    if (chapter.insufficientData) {
      chapters.push(getFallbackChapterScript(resolved, compiled, chapter, i, true));
      continue;
    }

    if (!apiKey) {
      recordFallback(diagnostics, "factScript", "no API key configured");
      chapters.push(getFallbackChapterScript(resolved, compiled, chapter, i, true));
      continue;
    }

    const start = Date.now();
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

      const { response, meta } = await callGeminiModel(ai, {
        contents: prompt,
        config: { temperature: 0.1, maxOutputTokens: 1000 }
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      const parsed = JSON.parse(text) as FactScriptChapter;

      const keyFacts = (Array.isArray(parsed.keyFacts) && parsed.keyFacts.length > 0 ? parsed.keyFacts : chapter.approvedFacts)
        .filter((f) => !containsPlaceholder(f));
      const cause = containsPlaceholder(parsed.cause) ? "" : parsed.cause || "";
      const effect = containsPlaceholder(parsed.effect) ? "" : parsed.effect || "";
      const takeaway = containsPlaceholder(parsed.takeaway) ? "" : parsed.takeaway || "";
      const insufficientData = keyFacts.length === 0 || !cause || !effect;

      chapters.push({
        chapterTitle: parsed.chapterTitle || chapter.title,
        referenceLabel: chapter.referenceLabel,
        questionAnswered: parsed.questionAnswered || chapter.readerQuestion,
        chronologicalPosition: i + 1,
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        dates: Array.isArray(parsed.dates) ? parsed.dates : [],
        locations: Array.isArray(parsed.locations) ? parsed.locations : [],
        people: Array.isArray(parsed.people) ? parsed.people : [],
        events: Array.isArray(parsed.events) ? parsed.events : [],
        cause,
        effect,
        keyFacts,
        quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
        connections: Array.isArray(parsed.connections) ? parsed.connections : [],
        takeaway,
        insufficientData,
      });

      recordGeminiSuccess(diagnostics, "factScript", meta, Date.now() - start);
    } catch (error) {
      console.warn(`generateFactScript failed for chapter ${i}, using fallback`, error);
      recordGeminiFailure(diagnostics, "factScript", error, Date.now() - start);
      chapters.push(getFallbackChapterScript(resolved, compiled, chapter, i, true));
    }
  }

  return { chapters };
}

// Deterministic recovery path. The V17 forensic audit found this function
// filling `cause`/`effect`/`takeaway` with five fixed templates keyed by
// chapter index — e.g. "motivating factors behind early phases of
// development," itself one of the exact phrases CLAUDE.md's writing rules
// ban (V17_FORENSIC_AUDIT.md, Bug in the Fact Script stage trace). A
// deterministic function has no way to actually derive a cause/effect
// relationship from raw facts without inventing one — that is a narrative
// synthesis task, not an extraction task — so this path no longer
// attempts it. `cause`/`effect`/`takeaway` are left empty and the chapter
// is always marked `insufficientData: true`: real facts (entities, dates,
// keyFacts) are still populated when available, but the chapter is
// dropped before the documentary writer stage rather than rendered with a
// fabricated relationship. This is a real content reduction versus V17,
// and it is intentional — see reports/releases/V18_PHASE1_IMPLEMENTATION_PLAN.md.
function getFallbackChapterScript(
  resolved: ResolvedEntity,
  compiled: CompiledOutput,
  chapter: NarrativeChapter,
  index: number,
  insufficientData: boolean
): FactScriptChapter {
  const years = compiled.timeline.map(t => t.year).filter(Boolean);
  const matchedEntities = compiled.namedEntities
    .filter(e => chapter.anchors.some(a => a.toLowerCase().includes(e.name.toLowerCase())))
    .map(e => e.name);

  return {
    chapterTitle: chapter.title,
    referenceLabel: chapter.referenceLabel,
    questionAnswered: chapter.readerQuestion,
    chronologicalPosition: index + 1,
    entities: matchedEntities.length > 0 ? matchedEntities : chapter.anchors,
    dates: years.slice(index, index + 2),
    locations: [],
    people: [],
    events: [],
    cause: "",
    effect: "",
    keyFacts: chapter.approvedFacts.filter((f) => !containsPlaceholder(f)),
    quotes: [],
    connections: [],
    takeaway: "",
    insufficientData,
  };
}
