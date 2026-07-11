export interface ResolvedEntity {
  entityType: string;
  confidence: number;
  reasoning: string;
  wikipediaPageId: number;
  wikidataId?: string;
  canonicalTitle: string;
  aliases: string[];
}

// Whether a stage's output came from a real generation call or a deterministic
// recovery template. "mixed" means some fields/sub-items on that stage's output
// used one path and some used the other (e.g. some chapters had real facts,
// one chapter did not).
export type GenerationMode = "primary" | "fallback" | "mixed";

// One of the categories src/lib/ai/geminiConfig.ts's classifyModelError()
// sorts every provider failure into. Kept here (not re-exported from
// geminiConfig.ts) so types/knowledge.ts has no dependency on the AI
// client layer.
export type ModelErrorCategory =
  | "invalid_model"
  | "unavailable_model"
  | "quota_exhausted"
  | "authentication_failure"
  | "malformed_response"
  | "parser_failure"
  | "safety_rejection"
  | "network_failure"
  | "unknown";

export interface StageDiagnostic {
  stage: string;
  provider: "gemini" | "none";
  // The model this stage was configured to use (GEMINI_PRIMARY_MODEL),
  // regardless of what was actually called.
  configuredModel: string | null;
  // The model actually invoked for this call — may differ from
  // configuredModel if the fallback model was used. Null if no model was
  // ever selected (provider unavailable).
  selectedModel: string | null;
  modelValidationAttempted: boolean;
  modelValidationSucceeded: boolean;
  supportedGenerationMethod: boolean;
  requestAttempted: boolean;
  requestSucceeded: boolean;
  failureReason: string | null;
  errorCategory: ModelErrorCategory | null;
  quotaError: boolean;
  deprecatedOrUnavailableModel: boolean;
  // True when the configured fallback model had to be used instead of the
  // configured primary model — always recorded explicitly, never a silent
  // substitution (see src/lib/ai/geminiConfig.ts).
  fallbackModelUsed: boolean;
  // True when this stage's own deterministic recovery template was used
  // instead of any real model output (renamed from the earlier
  // `fallbackUsed` field for clarity against fallbackModelUsed above,
  // which is about model selection, not content generation).
  fallbackContentUsed: boolean;
  durationMs: number;
}

// Every field is 0-1. Each one measures one real, independently-inspectable
// signal — none of these are ever hardcoded constants. See src/lib/knowledge/qualityGate.ts.
export interface ConfidenceBreakdown {
  provenanceCoverage: number;
  fieldCoverage: number;
  placeholderPenalty: number;
  fallbackPenalty: number;
  sourceAgreement: number;
  extractionCompleteness: number;
  factSpecificity: number;
  graphValidity: number;
  timelineValidity: number;
  validationPenalty: number;
}

export type ArtifactStatus = "PASS" | "PARTIAL" | "FAIL";

export interface QualityAssessment {
  generationMode: GenerationMode;
  fallbackRatio: number;
  provenanceCoverage: number;
  placeholderCount: number;
  verifiedFactRatio: number;
  qualityScore: number; // 0-100 composite, derived from confidenceBreakdown
  confidenceBreakdown: ConfidenceBreakdown;
  status: ArtifactStatus;
  modulesPassing: string[];
  modulesHidden: string[];
  reasons: string[]; // human-readable explanation of the verdict, for diagnostics only
}

export interface OntologyDefinition {
  name: string;
  requiredFields: string[];
  requiredEntities: string[];
  timelineSchema: {
    minEvents: number;
    maxEvents: number;
  };
  documentaryBlueprint: string[]; // e.g., ["Origins", "Major Works", "Legacy"]
  triviaStrategy: string;
  validationRules: string[];
}

export interface NamedEntity {
  name: string;
  type: string;
  description?: string;
  wikidataId?: string;
}

export interface GraphTriple {
  subject: string;
  predicate: string;
  object: string;
}

export interface TimelineEvent {
  year: string;
  headline: string;
  description: string;
  importance: number;
  connections: string[];
  image?: string | null;
}

export interface EvaluationMetrics {
  confidence: number;
  specificity: number;
  narrativeValue: number;
  educationalValue: number;
  visualValue: number;
  uniqueness: number;
  ontologyRelevance: number;
}

export interface EvaluatedFact {
  fact: string;
  score: number; // overall combined score
  metrics: EvaluationMetrics;
  reasoning?: string;
}

export interface VisualModule {
  type: string; // e.g., "timeline", "demographics", "corporate", "story", "technical"
  title: string;
  data: Record<string, any>;
}

export interface NarrativeChapter {
  chapterIndex: number;
  title: string;
  referenceLabel: string;
  readerQuestion: string;
  objectives: string[];
  approvedFacts: string[];
  anchors: string[];
  // true when there were no real approved facts available for this chapter
  // (e.g. the ranked-facts pool ran out). A chapter flagged this way must
  // not be filled with invented connective text — it is dropped downstream.
  insufficientData?: boolean;
}

export interface NarrativePlan {
  chapters: NarrativeChapter[];
}

export interface LintReport {
  passed: boolean;
  errors: string[];
  warnings: string[];
  checkedRules: Record<string, boolean>;
  timestamp: string;
}

export interface SurprisingInsight {
  fact: string;
  surpriseScore: number;
  readMoreTopic?: string;
}

export interface KnowledgeArtifact {
  version: string; // e.g., "15.0"
  compilerVersion: string;
  ontologyVersion: string;
  wikipediaRevision: string;
  wikidataRevision?: string;
  
  ontology: {
    name: string;
    labels: string[];
  };
  
  structuredFacts: Record<string, any>;
  namedEntities: NamedEntity[];
  knowledgeGraph: GraphTriple[];
  timeline: TimelineEvent[];
  rankedFacts: EvaluatedFact[];
  visualModules: VisualModule[];
  narrativePlan: NarrativePlan;
  triviaCandidates: SurprisingInsight[];
  relatedTopics: string[];
  
  // Kept for backward-compatible readers; values are now derived from
  // qualityAssessment.confidenceBreakdown, never hardcoded. See dag.ts.
  confidenceScores: {
    resolver: number;
    compiler: number;
    grader: number;
    overall: number;
  };

  qualityAssessment: QualityAssessment;
  stageDiagnostics: StageDiagnostic[];

  validationStatus: LintReport;
  checksum: string;
  dependencyHash: string;
  sourceReferences: Array<{ url: string; title: string }>;
  factScript?: FactScript;
  briefSummaryProvenance?: Array<{ sentence: string; fact: string }>;
}

export interface PerspectiveCard {
  title: string;
  summary: string;
  referenceLabel: string;
  readerQuestion: string;
  keyTakeaway: string;
  provenance?: Array<{ sentence: string; fact: string }>;
}

export interface FactScriptChapter {
  chapterTitle: string;
  // Carried over from NarrativeChapter.referenceLabel (the ontology
  // blueprint's own short label, e.g. "Causes", "Production") so the
  // documentary writer never has to re-derive a label by splitting
  // chapterTitle — that derivation was the source of a chapter-progress
  // label collapsing to "The" for any title starting with "The" (see
  // reports/audits/V17_FORENSIC_AUDIT.md, Bug #8).
  referenceLabel: string;
  questionAnswered: string;
  chronologicalPosition: number;
  entities: string[];
  dates: string[];
  locations: string[];
  people: string[];
  events: string[];
  cause: string;
  effect: string;
  keyFacts: string[];
  quotes: string[];
  connections: string[];
  takeaway: string;
  // true when keyFacts/cause/effect/takeaway have no real source basis.
  // A chapter flagged this way is dropped before the documentary writer stage.
  insufficientData?: boolean;
}

export interface FactScript {
  chapters: FactScriptChapter[];
}
