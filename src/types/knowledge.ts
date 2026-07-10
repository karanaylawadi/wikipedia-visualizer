export interface ResolvedEntity {
  entityType: string;
  confidence: number;
  reasoning: string;
  wikipediaPageId: number;
  wikidataId?: string;
  canonicalTitle: string;
  aliases: string[];
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
  
  confidenceScores: {
    resolver: number;
    compiler: number;
    grader: number;
    overall: number;
  };
  
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
}

export interface FactScript {
  chapters: FactScriptChapter[];
}
