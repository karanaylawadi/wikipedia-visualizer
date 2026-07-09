import type { LintReport, KnowledgeArtifact } from "@/types/knowledge";
import { validateOntologyFields, mapEntityTypeToOntology } from "../ontology/ontologyEngine";
import { isFactWeak } from "./factEvaluator";

export function lintArtifact(artifact: Omit<KnowledgeArtifact, "validationStatus">): LintReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checkedRules: Record<string, boolean> = {};

  const registerCheck = (name: string, passed: boolean, msg: string, isWarning = false) => {
    checkedRules[name] = passed;
    if (!passed) {
      if (isWarning) {
        warnings.push(msg);
      } else {
        errors.push(msg);
      }
    }
  };

  // 1. Check Ontology and Required Fields
  const ontologyName = artifact.ontology.name;
  const ontologyDef = mapEntityTypeToOntology(artifact.ontology.labels[0] || ontologyName);
  registerCheck("ontology_match", ontologyDef.name === ontologyName, `Ontology match mismatch: expected ${ontologyDef.name}, got ${ontologyName}`);
  
  const fieldErrors = validateOntologyFields(ontologyName, artifact.structuredFacts);
  registerCheck("required_fields_exist", fieldErrors.length === 0, fieldErrors.join("; "));

  // 2. Check Timeline completeness & order
  const timeline = artifact.timeline || [];
  registerCheck("timeline_non_empty", timeline.length > 0, "Timeline has zero events");
  registerCheck(
    "timeline_count_bounds",
    timeline.length >= ontologyDef.timelineSchema.minEvents && timeline.length <= ontologyDef.timelineSchema.maxEvents,
    `Timeline size (${timeline.length}) is outside the ontology boundary of [${ontologyDef.timelineSchema.minEvents}, ${ontologyDef.timelineSchema.maxEvents}]`
  );

  // Check timeline chronological order
  let yearsAreOrdered = true;
  let lastYear = -Infinity;
  for (const t of timeline) {
    const yrInt = parseInt(t.year.replace(/\D/g, ""), 10);
    if (!isNaN(yrInt)) {
      if (yrInt < lastYear) {
        yearsAreOrdered = false;
      }
      lastYear = yrInt;
    }
  }
  registerCheck("timeline_chronological", yearsAreOrdered, "Timeline is not in strict chronological order", true); // Warning rather than failure

  // 3. Knowledge Graph Connectivity
  const graph = artifact.knowledgeGraph || [];
  registerCheck("graph_has_triples", graph.length >= 5, `Knowledge graph is too sparse: got ${graph.length} triples, expected >= 5`);

  // Check if subject/object names match named entities or topic title
  let connectedTriples = 0;
  const entityNames = new Set(artifact.namedEntities.map(e => e.name.toLowerCase()));
  entityNames.add(artifact.ontology.labels[1]?.toLowerCase());
  entityNames.add(artifact.structuredFacts.title?.toLowerCase());

  for (const triple of graph) {
    const sub = triple.subject.toLowerCase();
    const obj = triple.object.toLowerCase();
    if (entityNames.has(sub) || entityNames.has(obj)) {
      connectedTriples++;
    }
  }
  registerCheck("graph_connected", connectedTriples > 0, "Knowledge graph triples are completely disconnected from the named entities");

  // 4. Named Entities Valid
  registerCheck("named_entities_non_empty", artifact.namedEntities.length > 0, "No named entities resolved in the artifact");

  // 5. No Weak/Robotic Facts or Sentences
  let weakFactCount = 0;
  for (const fact of artifact.rankedFacts) {
    if (isFactWeak(fact.fact)) {
      weakFactCount++;
    }
  }
  registerCheck("no_weak_facts", weakFactCount === 0, `Artifact contains ${weakFactCount} evaluated facts that have weak, generic, or robotic phrasing`);

  // 6. No Duplicate Facts/Sentences
  const normalizedFacts = artifact.rankedFacts.map(f => f.fact.toLowerCase().trim());
  const uniqueFacts = new Set(normalizedFacts);
  registerCheck("no_duplicate_facts", uniqueFacts.size === normalizedFacts.length, "Artifact contains duplicate facts in rankedFacts");

  // Check duplicate sentences
  const allSentences: string[] = [];
  const sentenceDuplicated = (sentence: string) => {
    const clean = sentence.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
    if (clean.length < 15 || clean.split(/\s+/).length < 4) return false;
    if (allSentences.includes(clean)) return true;
    allSentences.push(clean);
    return false;
  };

  let duplicateSentenceFound = false;
  artifact.rankedFacts.forEach(rf => {
    const sentences = rf.fact.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    sentences.forEach(s => {
      if (sentenceDuplicated(s)) {
        duplicateSentenceFound = true;
      }
    });
  });
  registerCheck("no_duplicate_sentences", !duplicateSentenceFound, "Artifact contains duplicate sentences across different facts");

  // 7. No Placeholder Wording
  let hasPlaceholder = false;
  const traverse = (obj: any): boolean => {
    if (typeof obj === "string") {
      const lower = obj.toLowerCase();
      return lower.includes("placeholder") || lower.includes("tbd") || lower.includes("details are n/a") || lower.includes("unknown director") || lower.includes("unknown founder");
    }
    if (Array.isArray(obj)) {
      return obj.some(item => traverse(item));
    }
    if (obj && typeof obj === "object") {
      return Object.values(obj).some(val => traverse(val));
    }
    return false;
  };
  hasPlaceholder = traverse(artifact.structuredFacts);
  registerCheck("no_placeholder_wording", !hasPlaceholder, "Artifact contains placeholder wording ('TBD', 'placeholder', 'N/A', etc.)");

  // 8. Confidence Thresholds Met
  const resolverConfidence = artifact.confidenceScores.resolver;
  const compilerConfidence = artifact.confidenceScores.compiler;
  const overallConfidence = artifact.confidenceScores.overall;
  registerCheck("resolver_confidence_ok", resolverConfidence >= 0.70, `Entity resolver confidence is too low: ${resolverConfidence}`);
  registerCheck("compiler_confidence_ok", compilerConfidence >= 0.70, `Knowledge compiler confidence is too low: ${compilerConfidence}`);
  registerCheck("overall_confidence_ok", overallConfidence >= 0.70, `Overall confidence is too low: ${overallConfidence}`);

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    checkedRules,
    timestamp: new Date().toISOString()
  };
}
