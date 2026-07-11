import type { ResolvedEntity, GraphTriple, StageDiagnostic } from "@/types/knowledge";
import type { CompiledOutput } from "./compiler";
import { containsPlaceholder } from "./placeholderDetector";
import { recordFallback, recordGeminiSuccess, recordGeminiFailure } from "./diagnostics";
import { callGeminiModel } from "@/lib/ai/geminiConfig";

// Rejects a triple before it can enter the graph. The V17 forensic audit's
// sharpest finding: the old fallback graph builder trusted structured-fact
// values as real entity names without checking whether they were
// placeholder text, producing triples like
// `"Compiled detail for director" DIRECTED Inception`
// (V17_FORENSIC_AUDIT.md, Bug #2). This gate is applied to every triple
// regardless of whether it came from the LLM or the heuristic fallback.
export function validateTriple(triple: GraphTriple, seen: Set<string>): boolean {
  const subject = triple.subject?.trim();
  const object = triple.object?.trim();
  const predicate = triple.predicate?.trim();

  if (!subject || !object || !predicate) return false; // empty labels
  if (subject.length < 2 || object.length < 2) return false; // minimum specificity
  if (containsPlaceholder(subject) || containsPlaceholder(object)) return false; // placeholder nodes
  if (subject.toLowerCase() === object.toLowerCase()) return false; // self-relation
  if (predicate === "HAS_PROPERTY" && /^Detail_Aspect_\d+$/i.test(object)) return false; // unsupported synthetic edge

  const key = `${subject.toLowerCase()}|${predicate.toLowerCase()}|${object.toLowerCase()}`;
  if (seen.has(key)) return false; // duplicate node/edge
  seen.add(key);
  return true;
}

export async function buildKnowledgeGraph(
  resolved: ResolvedEntity,
  compiled: CompiledOutput,
  diagnostics: StageDiagnostic[] = []
): Promise<GraphTriple[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    recordFallback(diagnostics, "knowledgeGraph", "no API key configured");
    return getFallbackGraph(resolved, compiled);
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a Semantic Web and Knowledge Graph Architect. Build a clean, normalized set of relationship triples (Subject -> Predicate -> Object) for the topic "${resolved.canonicalTitle}".

Topic Details:
- Canonical Title: "${resolved.canonicalTitle}"
- Entity Type: "${resolved.entityType}"
- Compiled Facts: ${JSON.stringify(compiled.structuredFacts)}
- Named Entities: ${JSON.stringify(compiled.namedEntities.slice(0, 10))}

Your task is to construct a semantic graph of exact relationship triples.
Use active, uppercase predicates (e.g., DIRECTED, STARRED_IN, COMPOSED, CAPITAL_OF, BORDERED_BY, INVENTED_BY, INFLUENCED_BY, FOUNDED_BY, PART_OF, THEME_OF, DEVELOPED, DISCOVERED_BY).

Rules:
1. Ensure the subject and object are specific named entities or concepts.
2. Predicates must be clean, single-word uppercase strings (use underscores if needed, like MEMBER_OF).
3. Generate between 8 and 15 highly relevant triples.

Return a valid JSON object matching this schema:
{
  "triples": [
    {"subject": "string", "predicate": "string", "object": "string"}
  ]
}

Only return raw JSON. Start with { and end with }. Do not wrap in markdown.`;

  const start = Date.now();
  try {
    const { response, meta } = await callGeminiModel(ai, {
      contents: prompt,
      config: { temperature: 0.15, maxOutputTokens: 800 }
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { triples: GraphTriple[] };
    const seen = new Set<string>();
    const validated = (parsed.triples || []).filter((t) => validateTriple(t, seen));

    recordGeminiSuccess(diagnostics, "knowledgeGraph", meta, Date.now() - start);

    return validated;
  } catch (error) {
    console.warn("buildKnowledgeGraph failed, using fallback heuristic graph", error);
    recordGeminiFailure(diagnostics, "knowledgeGraph", error, Date.now() - start);
    return getFallbackGraph(resolved, compiled);
  }
}

// Derives triples only from real, ontology-mapped structured-fact values.
// A field compiler.ts could not fill (see getFallbackCompilation) is simply
// absent from `sf`, so no triple is generated for it here — this recovery
// path never invents a subject/object to keep a count target, and no
// longer pads short graphs with synthetic `HAS_PROPERTY -> Detail_Aspect_N`
// filler (removed outright; that branch never carried information — see
// V17_FORENSIC_AUDIT.md, Bugs #2 and #15). An honestly short or empty graph
// is the correct output when there is no real data, and the quality gate
// hides the graph module rather than render a padded one.
function getFallbackGraph(resolved: ResolvedEntity, compiled: CompiledOutput): GraphTriple[] {
  const triples: GraphTriple[] = [];
  const title = resolved.canonicalTitle;
  const sf = compiled.structuredFacts;

  if (resolved.entityType === "Movie" || resolved.entityType === "TV Series") {
    if (sf.director) triples.push({ subject: sf.director, predicate: "DIRECTED", object: title });
    if (sf.composer) triples.push({ subject: sf.composer, predicate: "COMPOSED", object: title });
    if (Array.isArray(sf.cast)) {
      sf.cast.forEach((actor: string) => {
        triples.push({ subject: actor, predicate: "STARRED_IN", object: title });
      });
    }
    if (Array.isArray(sf.themes)) {
      sf.themes.forEach((theme: string) => {
        triples.push({ subject: theme, predicate: "THEME_OF", object: title });
      });
    }
  } else if (resolved.entityType === "Person" || resolved.entityType === "Musical Artist") {
    if (sf.occupation) triples.push({ subject: title, predicate: "WORKED_AS", object: sf.occupation });
    if (Array.isArray(sf.majorWorks)) {
      sf.majorWorks.forEach((work: string) => {
        triples.push({ subject: title, predicate: "CREATED", object: work });
      });
    }
  } else if (resolved.entityType === "Company" || resolved.entityType === "Brand") {
    if (sf.founder) triples.push({ subject: sf.founder, predicate: "FOUNDED", object: title });
    if (sf.headquarters) triples.push({ subject: title, predicate: "HEADQUARTERED_IN", object: sf.headquarters });
    if (Array.isArray(sf.products)) {
      sf.products.forEach((prod: string) => {
        triples.push({ subject: title, predicate: "MANUFACTURES", object: prod });
      });
    }
  } else if (resolved.entityType === "Country" || resolved.entityType === "City") {
    if (sf.capital) triples.push({ subject: sf.capital, predicate: "CAPITAL_OF", object: title });
    if (sf.government) triples.push({ subject: title, predicate: "GOVERNED_AS", object: sf.government });
  } else if (resolved.entityType === "Technology" || resolved.entityType === "Programming Language") {
    if (sf.inventor) triples.push({ subject: sf.inventor, predicate: "INVENTED", object: title });
  } else if (resolved.entityType === "Scientific Concept" || resolved.entityType === "Mathematical Concept") {
    if (sf.discoverer) triples.push({ subject: sf.discoverer, predicate: "DISCOVERED", object: title });
  }

  // Real (non-self) named entities the compiler actually resolved can add
  // a genuine, if generic, association — still gated by validateTriple.
  for (const ent of compiled.namedEntities) {
    if (ent?.name && ent.name.toLowerCase() !== title.toLowerCase()) {
      triples.push({ subject: ent.name, predicate: "ASSOCIATED_WITH", object: title });
    }
  }

  const seen = new Set<string>();
  return triples.filter((t) => validateTriple(t, seen));
}
