import type { ResolvedEntity, NamedEntity, TimelineEvent, SurprisingInsight, StageDiagnostic } from "@/types/knowledge";
import type { ArticleIntelligence } from "@/lib/editorial/wikipedia";
import { isRecognizableRelatedTopic } from "@/lib/editorial/wikipedia";
import { mapEntityTypeToOntology } from "../ontology/ontologyEngine";
import { containsPlaceholder } from "./placeholderDetector";
import { cleanFragment, cleanSentence } from "./sentenceCleaner";
import { recordFallback, recordGeminiSuccess, recordGeminiFailure } from "./diagnostics";
import { callGeminiModel } from "@/lib/ai/geminiConfig";

export interface CompiledOutput {
  structuredFacts: Record<string, any>;
  namedEntities: NamedEntity[];
  timeline: TimelineEvent[];
  triviaCandidates: SurprisingInsight[];
  relatedTopics: string[];
  sourceSections: Array<{ title: string; content: string }>;
  // Names of structuredFacts keys that could not be filled with real,
  // verified data. These fields are intentionally absent from
  // structuredFacts rather than filled with placeholder text — see
  // getFallbackCompilation() below and reports/audits/V17_FORENSIC_AUDIT.md
  // Bug #9/#13.
  fallbackFieldNames: string[];
}

const EVENT_KEYWORDS = [
  "war", "battle", "launch", "founded", "release", "released", "elected",
  "coronation", "treaty", "independence", "publish", "published", "invent",
  "invented", "discover", "discovered", "attack", "revolution", "agreement",
  "born", "died", "established", "formed", "signed", "premiere", "premiered",
  "annexed", "surrendered", "constitution", "declared", "unified", "founded",
];

export async function compileKnowledge(
  resolved: ResolvedEntity,
  article: ArticleIntelligence,
  diagnostics: StageDiagnostic[] = []
): Promise<CompiledOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  const ontology = mapEntityTypeToOntology(resolved.entityType);

  if (!apiKey) {
    recordFallback(diagnostics, "compiler", "no API key configured");
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
1. "timeline": Between ${ontology.timelineSchema.minEvents} and ${ontology.timelineSchema.maxEvents} major chronological milestones.
   Format: [{"year": "year string", "headline": "short headline (max 5 words)", "description": "concise details (max 15-20 words)", "importance": 1-10, "connections": ["entity name"], "image": null}]
   Do NOT use placeholder terms like "significant milestone" in the timeline event text.
2. "triviaCandidates": Exactly 8-12 highly surprising, concrete, specific facts or pieces of trivia.
   Format: [{"fact": "concise surprising fact (max 2-3 sentences)", "surpriseScore": 1-10, "readMoreTopic": "related topic title"}]
3. "namedEntities": Key people, locations, organizations, or concepts mentioned in the text. Format: [{"name": "entity name", "type": "Person/Place/Org/Concept", "description": "brief 1-sentence identification"}].
4. "relatedTopics": List of up to 10 canonical titles of related topics.
5. "sourceSections": List of sections in the article. For each, include "title" (heading) and "content" (brief bullet points of 2-4 key facts).

Return a valid JSON object matching this schema:
{
  "structuredFacts": {
    // compiled ontology fields as defined above
  },
  "timeline": [
    {
      "year": "string",
      "headline": "string",
      "description": "string",
      "importance": number,
      "connections": ["string"],
      "image": null
    }
  ],
  "triviaCandidates": [
    {
      "fact": "string",
      "surpriseScore": number,
      "readMoreTopic": "string"
    }
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

  const start = Date.now();
  try {
    const { response, meta } = await callGeminiModel(ai, {
      contents: prompt,
      config: { temperature: 0.1, maxOutputTokens: 6000 }
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
    // A field the model itself returned as placeholder-shaped text is
    // treated exactly like a fallback field, not real data — the ingestion
    // boundary applies regardless of which path produced the value.
    const fallbackFieldNames: string[] = [];
    for (const [key, value] of Object.entries(parsed.structuredFacts)) {
      if (containsPlaceholder(typeof value === "string" ? value : JSON.stringify(value))) {
        fallbackFieldNames.push(key);
        delete parsed.structuredFacts[key];
      }
    }
    parsed.fallbackFieldNames = fallbackFieldNames;

    recordGeminiSuccess(diagnostics, "compiler", meta, Date.now() - start);

    return parsed;
  } catch (error) {
    console.warn("compileKnowledge failed, falling back to heuristic compiler", error);
    recordGeminiFailure(diagnostics, "compiler", error, Date.now() - start);
    return getFallbackCompilation(resolved, article);
  }
}

// Deterministic recovery path used when no LLM call is available or the
// call failed. This function must never invent text that looks like real
// data. A field it cannot fill from real source text is left ABSENT (not
// set to a placeholder string) — the quality gate treats an absent
// required field as low field-coverage, which is the honest outcome,
// rather than a full-looking field that is actually empty content
// (V17_FORENSIC_AUDIT.md, Bug #9/#13: "Compiled detail for X" and
// ["Significant Item 1", "Significant Item 2"] both used to fill this gap
// and both propagated further downstream into the knowledge graph).
function getFallbackCompilation(resolved: ResolvedEntity, article: ArticleIntelligence): CompiledOutput {
  const ontology = mapEntityTypeToOntology(resolved.entityType);
  const structuredFacts: Record<string, any> = {};
  const fallbackFieldNames = [...ontology.requiredFields];
  // No required field can be filled with real, source-backed data without
  // an extraction pass this recovery path does not have — every one is
  // recorded as a fallback field rather than populated with filler text.

  const paragraphs = article.extract.split(/\n+/).map(p => p.trim()).filter(p => p && !p.includes("=="));
  const sentences = article.extract
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const timeline: TimelineEvent[] = [];
  const seenYears = new Set<string>();
  for (const sentence of sentences) {
    const yearMatch = sentence.match(/\b(1\d{3}|2\d{3})\b/);
    if (!yearMatch) continue;
    const year = yearMatch[0];
    if (seenYears.has(year)) continue;

    // Significance filter: only treat a year as a timeline-worthy moment if
    // its sentence names a real event or a proper noun near the date —
    // otherwise a stray citation year (e.g. "population as of 2026") gets
    // extracted as if it were history, which the forensic audit found
    // happening for Japan (Bug #7).
    const lowerSentence = sentence.toLowerCase();
    const hasEventKeyword = EVENT_KEYWORDS.some((kw) => lowerSentence.includes(kw));
    const hasProperNounNearYear = /\b[A-Z][a-z]{2,}\b/.test(sentence.replace(year, ""));
    if (!hasEventKeyword && !hasProperNounNearYear) continue;
    if (containsPlaceholder(sentence)) continue;

    seenYears.add(year);
    const description = cleanSentence(sentence, 28);
    const headline = cleanFragment(sentence.replace(year, "").trim(), 8) || `Events of ${year}`;
    timeline.push({
      year,
      headline,
      description,
      importance: hasEventKeyword ? 8 : 6,
      connections: [resolved.canonicalTitle],
      image: null,
    });
    if (timeline.length >= 8) break;
  }
  // No padding when fewer than the ontology minimum survive filtering — an
  // honestly short timeline is preferred over an invented one. The quality
  // gate hides the timeline module entirely when fewer than 3 entries exist.

  const recognizableLinks = article.links.filter((l) => isRecognizableRelatedTopic(l.title, l.description));

  const triviaCandidates: SurprisingInsight[] = paragraphs
    .slice(0, 10)
    .map((p, idx) => {
      const sentenceList = p.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
      const factText = (sentenceList.slice(0, 2).join(". ") + ".").replace(/\.\./g, ".");
      if (containsPlaceholder(factText)) return null;

      // Only attach a "read more" link when its title genuinely shares a
      // token with this specific paragraph — a positional assignment from
      // an unrelated part of the article is worse than no link at all
      // (V17_FORENSIC_AUDIT.md, Bug #17).
      const paragraphTokens = new Set(p.toLowerCase().match(/[a-z]{4,}/g) || []);
      const relatedLink = recognizableLinks.find((l) => {
        const titleTokens = l.title.toLowerCase().match(/[a-z]{4,}/g) || [];
        return titleTokens.some((t) => paragraphTokens.has(t));
      });

      const insight: SurprisingInsight = {
        fact: factText,
        surpriseScore: 10 - idx,
      };
      if (relatedLink) insight.readMoreTopic = relatedLink.title;
      return insight;
    })
    .filter((c): c is SurprisingInsight => c !== null);

  return {
    structuredFacts,
    namedEntities: [
      { name: resolved.canonicalTitle, type: "Concept", description: "The primary resolved subject." }
    ],
    timeline,
    triviaCandidates,
    relatedTopics: recognizableLinks.slice(0, 8).map((l) => l.title),
    sourceSections: article.sectionHeadings.slice(0, 4).map(h => ({
      title: h,
      content: ""
    })),
    fallbackFieldNames,
  };
}
