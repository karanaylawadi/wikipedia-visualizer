import type {
  ResolvedEntity,
  OntologyDefinition,
  NamedEntity,
  GraphTriple,
  TimelineEvent,
  EvaluatedFact,
  SurprisingInsight,
  PerspectiveCard,
  StageDiagnostic,
  ConfidenceBreakdown,
  QualityAssessment,
  ArtifactStatus,
} from "@/types/knowledge";
import { containsPlaceholder, isPlaceholderValue, scanForPlaceholders } from "./placeholderDetector";
import { fallbackRatioFromDiagnostics } from "./diagnostics";

// The only place in the codebase allowed to compute a confidence or quality
// number. Every value here is derived from a real, independently-inspectable
// signal — no hardcoded literals. This exists specifically because the V17
// forensic audit found dag.ts hardcoding `compiler: 0.95` and `overall: 0.92`
// as constants that never varied regardless of what was actually compiled
// (V17_FORENSIC_AUDIT.md, Bug #1) and entityResolver.ts hardcoding a
// heuristic-path confidence of 0.96 specifically to skip verification
// (Bug #4). Neither can happen again if every number here traces to input
// data instead of a literal.

export interface QualityGateInput {
  resolved: ResolvedEntity;
  ontology: OntologyDefinition;
  structuredFacts: Record<string, any>;
  fallbackFieldNames: string[];
  namedEntities: NamedEntity[];
  knowledgeGraph: GraphTriple[];
  timeline: TimelineEvent[];
  rankedFacts: EvaluatedFact[];
  triviaCandidates: SurprisingInsight[];
  relatedTopics: string[];
  cards: PerspectiveCard[];
  totalChaptersPlanned: number;
  insufficientChapterCount: number;
  briefSummary: string;
  briefSummaryProvenance: Array<{ sentence: string; fact: string }>;
  diagnostics: StageDiagnostic[];
}

// Weights sum to 1.0. Trust signals (is this data real and unpoisoned) are
// weighted higher than richness signals (is there a lot of it) — a small,
// honest artifact should outscore a large, placeholder-filled one.
const WEIGHTS: Record<keyof ConfidenceBreakdown, number> = {
  placeholderPenalty: 0.20,
  fieldCoverage: 0.15,
  provenanceCoverage: 0.15,
  fallbackPenalty: 0.15,
  graphValidity: 0.08,
  timelineValidity: 0.08,
  factSpecificity: 0.07,
  extractionCompleteness: 0.05,
  sourceAgreement: 0.04,
  validationPenalty: 0.03,
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function cleanSentenceForCompare(str: string): string {
  return str.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()'"\s]/g, "").trim();
}

function computeProvenanceCoverage(
  briefSummary: string,
  briefSummaryProvenance: Array<{ sentence: string; fact: string }>,
  cards: PerspectiveCard[]
): number {
  let totalSentences = 0;
  let validSentences = 0;

  const check = (text: string, provenance: Array<{ sentence: string; fact: string }> | undefined) => {
    const sentences = (text || "").split(/(?<=[.!?])\s+/).filter(Boolean);
    totalSentences += sentences.length;
    const list = provenance || [];
    const provenanceSet = new Set(list.map((p) => cleanSentenceForCompare(p.sentence)));
    sentences.forEach((s) => {
      const clean = cleanSentenceForCompare(s);
      const matched = list.find((p) => clean.includes(cleanSentenceForCompare(p.sentence)) && p.fact && p.fact.trim().length > 0);
      if (matched || provenanceSet.has(clean)) validSentences++;
    });
  };

  check(briefSummary, briefSummaryProvenance);
  cards.forEach((c) => check(c.summary, c.provenance));

  if (totalSentences === 0) return 0;
  return clamp01(validSentences / totalSentences);
}

function computeFieldCoverage(
  ontology: OntologyDefinition,
  structuredFacts: Record<string, any>,
  fallbackFieldNames: string[]
): number {
  const required = ontology.requiredFields;
  if (required.length === 0) return 1;
  const fallbackSet = new Set(fallbackFieldNames);
  let covered = 0;
  for (const field of required) {
    const value = structuredFacts[field];
    const present = value !== undefined && value !== null && value !== "";
    const arrayEmpty = Array.isArray(value) && value.length === 0;
    if (present && !arrayEmpty && !fallbackSet.has(field) && !isPlaceholderValue(value)) {
      covered++;
    }
  }
  return clamp01(covered / required.length);
}

function computePlaceholderPenalty(input: QualityGateInput): { penalty: number; count: number } {
  const hits = [
    ...scanForPlaceholders(input.structuredFacts, "structuredFacts"),
    ...scanForPlaceholders(input.timeline, "timeline"),
    ...scanForPlaceholders(input.triviaCandidates, "triviaCandidates"),
    ...scanForPlaceholders(input.cards, "cards"),
  ];
  const totalScanned =
    Object.keys(input.structuredFacts).length +
    input.timeline.length * 2 +
    input.triviaCandidates.length +
    input.cards.length * 3 +
    1; // +1 avoids division by zero on a near-empty artifact
  const penalty = clamp01(1 - hits.length / totalScanned);
  return { penalty, count: hits.length };
}

function computeGraphValidity(triples: GraphTriple[]): number {
  if (triples.length === 0) return 0;
  const valid = triples.filter(
    (t) =>
      t.subject?.trim() &&
      t.object?.trim() &&
      t.predicate?.trim() &&
      t.predicate !== "HAS_PROPERTY" &&
      t.subject.toLowerCase() !== t.object.toLowerCase() &&
      !containsPlaceholder(t.subject) &&
      !containsPlaceholder(t.object)
  );
  return clamp01(valid.length / triples.length);
}

function computeTimelineValidity(timeline: TimelineEvent[]): number {
  if (timeline.length === 0) return 0;
  const valid = timeline.filter(
    (t) => !containsPlaceholder(t.headline) && !containsPlaceholder(t.description) && t.headline?.trim() && t.description?.trim()
  );
  return clamp01(valid.length / timeline.length);
}

function computeFactSpecificity(rankedFacts: EvaluatedFact[]): number {
  if (rankedFacts.length === 0) return 0;
  const sum = rankedFacts.reduce((acc, f) => acc + (f.metrics?.specificity ?? 0), 0);
  return clamp01(sum / rankedFacts.length);
}

function computeExtractionCompleteness(input: QualityGateInput): number {
  const signals = [
    input.timeline.length > 0,
    input.namedEntities.length > 0,
    input.triviaCandidates.length > 0,
    input.relatedTopics.length > 0,
    input.knowledgeGraph.length > 0,
  ];
  return clamp01(signals.filter(Boolean).length / signals.length);
}

function computeValidationPenalty(input: QualityGateInput): number {
  if (input.totalChaptersPlanned === 0) return 0;
  return clamp01(1 - input.insufficientChapterCount / input.totalChaptersPlanned);
}

export function assessArtifactQuality(input: QualityGateInput): QualityAssessment {
  const fallbackRatio = fallbackRatioFromDiagnostics(input.diagnostics);
  const { penalty: placeholderPenalty, count: placeholderCount } = computePlaceholderPenalty(input);

  const breakdown: ConfidenceBreakdown = {
    provenanceCoverage: computeProvenanceCoverage(input.briefSummary, input.briefSummaryProvenance, input.cards),
    fieldCoverage: computeFieldCoverage(input.ontology, input.structuredFacts, input.fallbackFieldNames),
    placeholderPenalty,
    fallbackPenalty: clamp01(1 - fallbackRatio),
    sourceAgreement: clamp01(input.resolved.confidence),
    extractionCompleteness: computeExtractionCompleteness(input),
    factSpecificity: computeFactSpecificity(input.rankedFacts),
    graphValidity: computeGraphValidity(input.knowledgeGraph),
    timelineValidity: computeTimelineValidity(input.timeline),
    validationPenalty: computeValidationPenalty(input),
  };

  let weightedSum = 0;
  (Object.keys(WEIGHTS) as Array<keyof ConfidenceBreakdown>).forEach((key) => {
    weightedSum += breakdown[key] * WEIGHTS[key];
  });
  const qualityScore = Math.round(clamp01(weightedSum) * 100);

  const verifiedFactRatio = clamp01(
    input.rankedFacts.filter((f) => f.score >= 0.65 && !containsPlaceholder(f.fact)).length /
      Math.max(1, input.rankedFacts.length)
  );

  const generationMode = fallbackRatio === 0 ? "primary" : fallbackRatio === 1 ? "fallback" : "mixed";

  // Status rule: any placeholder contamination or majority-fallback
  // generation caps the artifact below PASS, regardless of how good the
  // remaining signals look. A fallback-generated artifact must never
  // receive a passing status (explicit product requirement).
  let status: ArtifactStatus;
  const reasons: string[] = [];

  if (qualityScore < 40 || breakdown.fieldCoverage < 0.25) {
    status = "FAIL";
    reasons.push(`quality score ${qualityScore}/100 or ontology field coverage ${(breakdown.fieldCoverage * 100).toFixed(0)}% too low for any module to be trustworthy`);
  } else if (qualityScore < 70 || fallbackRatio > 0.5 || placeholderCount > 0) {
    status = "PARTIAL";
    if (fallbackRatio > 0.5) reasons.push(`${(fallbackRatio * 100).toFixed(0)}% of generation stages used fallback, not primary generation`);
    if (placeholderCount > 0) reasons.push(`${placeholderCount} placeholder-contaminated value(s) detected and excluded`);
    if (qualityScore < 70) reasons.push(`quality score ${qualityScore}/100 below the PASS threshold of 70`);
  } else {
    status = "PASS";
    reasons.push("all signals above threshold, no placeholder contamination, majority primary generation");
  }

  const modulesPassing: string[] = [];
  const modulesHidden: string[] = [];

  const evaluateModule = (name: string, isPassing: boolean, reason: string) => {
    if (isPassing) {
      modulesPassing.push(name);
    } else {
      modulesHidden.push(name);
      reasons.push(`module "${name}" hidden: ${reason}`);
    }
  };

  evaluateModule(
    "timeline",
    input.timeline.filter((t) => !containsPlaceholder(t.headline) && !containsPlaceholder(t.description)).length >= 3,
    "fewer than 3 non-placeholder timeline events"
  );
  evaluateModule("cards", input.cards.length > 0, "no chapters had sufficient real facts to write");
  evaluateModule(
    "didYouKnow",
    input.triviaCandidates.filter((t) => !containsPlaceholder(t.fact) && t.fact.trim().length > 0).length > 0,
    "no non-placeholder trivia candidates"
  );
  evaluateModule(
    "relatedTopics",
    input.relatedTopics.filter((t) => t && t.trim().length > 0).length > 0,
    "no related topics available"
  );
  evaluateModule(
    "structuredFactsData",
    breakdown.fieldCoverage >= 0.5,
    `only ${(breakdown.fieldCoverage * 100).toFixed(0)}% of required ontology fields have real values (need >= 50%)`
  );
  evaluateModule("knowledgeGraph", breakdown.graphValidity > 0, "no valid (non-placeholder, non-synthetic) graph triples");

  return {
    generationMode,
    fallbackRatio: clamp01(fallbackRatio),
    provenanceCoverage: breakdown.provenanceCoverage,
    placeholderCount,
    verifiedFactRatio,
    qualityScore,
    confidenceBreakdown: breakdown,
    status,
    modulesPassing,
    modulesHidden,
    reasons,
  };
}

// Reconciles the quality gate's own verdict with the linter's rule-based
// pass/fail (run separately, after this module, because the linter needs
// the final confidenceScores derived from this assessment). A linter
// failure can only ever downgrade status, never upgrade it.
export function reconcileWithLintReport(assessment: QualityAssessment, lintPassed: boolean): QualityAssessment {
  if (lintPassed || assessment.status === "FAIL") return assessment;
  const downgraded: ArtifactStatus = assessment.status === "PASS" ? "PARTIAL" : assessment.status;
  return {
    ...assessment,
    status: downgraded,
    reasons: [...assessment.reasons, "downgraded because lintArtifact() reported validation errors"],
  };
}

// Derives the legacy confidenceScores block from the real assessment
// instead of hardcoding it. Kept for backward-compatible readers of
// KnowledgeArtifact.confidenceScores.
export function deriveConfidenceScores(resolved: ResolvedEntity, assessment: QualityAssessment) {
  return {
    resolver: clamp01(resolved.confidence),
    compiler: assessment.confidenceBreakdown.fieldCoverage,
    grader: assessment.confidenceBreakdown.factSpecificity,
    overall: assessment.qualityScore / 100,
  };
}
