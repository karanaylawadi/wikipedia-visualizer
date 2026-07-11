import { resolveEntity } from "./entityResolver";
import { compileKnowledge, CompiledOutput } from "./compiler";
import { buildKnowledgeGraph } from "./knowledgeGraph";
import { evaluateFacts } from "./factEvaluator";
import { planNarrative } from "./narrativePlanner";
import { generateFactScript } from "./factScript";
import { writeDocumentarySummary, writeDocumentaryCard, writeEditorialBrief, sanitizeBannedWords } from "./documentaryWriter";
import { polishDocumentary } from "./stylePolish";
import { lintArtifact } from "./linter";
import { assessArtifactQuality, reconcileWithLintReport, deriveConfidenceScores } from "./qualityGate";
import { shouldAcceptWrite } from "./cacheGuard";
import { createDiagnosticsCollector } from "./diagnostics";
import {
  loadLocalArtifact,
  saveLocalArtifact,
  calculateChecksum,
  calculateDependencyHash,
  COMPILER_VERSION,
  ONTOLOGY_VERSION,
  QUALITY_GATE_VERSION,
} from "./store";
import type {
  KnowledgeArtifact,
  TimelineEvent,
  GraphTriple,
  EvaluatedFact,
  VisualModule,
  NarrativePlan,
  PerspectiveCard,
  FactScript,
  SurprisingInsight,
  StageDiagnostic,
} from "@/types/knowledge";
import type { ArticleIntelligence } from "../editorial/wikipedia";
import { mapEntityTypeToOntology } from "../ontology/ontologyEngine";

export async function processKnowledgeDAG(
  topic: string,
  article: ArticleIntelligence
): Promise<KnowledgeArtifact> {
  const diagnostics: StageDiagnostic[] = createDiagnosticsCollector();

  // Step 1: Stage 1 Entity Resolver
  const resolved = await resolveEntity(topic, diagnostics);

  // Step 2: Determine Current Inputs & Revision
  const wikipediaRevision = article.timestamp || "rev-1.0";
  const sourceTextChecksum = calculateChecksum(article.extract);
  const currentDependencyHash = calculateDependencyHash({
    compilerVersion: COMPILER_VERSION,
    ontologyVersion: ONTOLOGY_VERSION,
    wikipediaRevision,
    sourceTextChecksum,
    qualityGateVersion: QUALITY_GATE_VERSION,
  });

  // Step 3: Load existing cached artifact
  const cached = loadLocalArtifact(resolved.entityType, resolved.canonicalTitle);

  // Determine incremental flags. Bumping COMPILER_VERSION/ONTOLOGY_VERSION
  // to "v18.0" (store.ts) means every artifact compiled before this phase
  // — all 16 committed under knowledge/ at the time of the V17 forensic
  // audit — is treated as stale here and recompiled on next read.
  // A cached FAIL always retries rather than being treated as
  // permanently up to date — a FAIL is never supposed to be written by
  // cacheGuard.ts going forward (see shouldAcceptWrite()), but this is a
  // deliberate self-healing check for artifacts written before that guard
  // existed, or any future edge case that reaches disk despite it. A
  // transient failure (e.g. a rate-limited API key) should not stick a
  // topic at FAIL forever once the underlying cause is resolved.
  const needsRecompilation =
    !cached ||
    cached.compilerVersion !== COMPILER_VERSION ||
    cached.ontologyVersion !== ONTOLOGY_VERSION ||
    cached.wikipediaRevision !== wikipediaRevision ||
    cached.dependencyHash !== currentDependencyHash ||
    cached.qualityAssessment?.status === "FAIL";

  let compiled: CompiledOutput;
  let knowledgeGraph: GraphTriple[];
  let rankedFacts: EvaluatedFact[];
  let timeline: TimelineEvent[];
  let triviaCandidates: SurprisingInsight[];
  let narrativePlan: NarrativePlan;
  let briefSummaryText = "";
  let editorialBriefText = "";
  let editorialBriefProvenance: Array<{ sentence: string; fact: string }> | undefined;
  let perspectiveCards: PerspectiveCard[] = [];
  let factScript: FactScript | undefined;
  let briefSummaryProvenance: Array<{ sentence: string; fact: string }> | undefined;
  let totalChaptersPlanned = 0;
  let insufficientChapterCount = 0;

  if (needsRecompilation) {
    console.log(`[DAG] Incremental cache miss for "${resolved.canonicalTitle}". Running compiler...`);

    // Step 4: Stage 3 Compile Knowledge
    compiled = await compileKnowledge(resolved, article, diagnostics);

    // Step 5: Stage 5 Knowledge Graph Builder
    knowledgeGraph = await buildKnowledgeGraph(resolved, compiled, diagnostics);

    // Step 6: Stage 6 Fact Evaluation Engine
    rankedFacts = await evaluateFacts(resolved, compiled, diagnostics);

    // Step 7: Build Timeline (input is dates, events, people from compiler output)
    timeline = compiled.timeline;

    // Step 8: Stage 9 Narrative Planner
    narrativePlan = await planNarrative(resolved, compiled, rankedFacts, diagnostics);

    // Phase 1: Fact Script Engine
    factScript = await generateFactScript(resolved, compiled, rankedFacts, narrativePlan, diagnostics);

    totalChaptersPlanned = narrativePlan.chapters.length;
    insufficientChapterCount = factScript.chapters.filter((c) => c.insufficientData).length;

    // Phase 2: Documentary Writer
    const summaryData = await writeDocumentarySummary(resolved, factScript, diagnostics);
    briefSummaryText = summaryData.summary;
    briefSummaryProvenance = summaryData.provenance;

    // V19: the single editorial article (180–250 words). Null when it can't
    // be honestly written — the artifact then simply carries no article and
    // the UI omits the section. Text and provenance are already sanitized
    // and validated inside the writer; deliberately not routed through the
    // style-polish pass, whose sentence-count-preserving contract is built
    // around the summary/cards, not a multi-paragraph article.
    const editorialBriefData = await writeEditorialBrief(resolved, factScript, diagnostics);
    if (editorialBriefData) {
      editorialBriefText = editorialBriefData.brief;
      editorialBriefProvenance = editorialBriefData.provenance;
    }

    // A chapter flagged insufficientData (no real facts, or no real
    // cause/effect available deterministically) is dropped here rather
    // than written with invented content — see factScript.ts and
    // reports/audits/V17_FORENSIC_AUDIT.md (Japan chapter 5 case study:
    // a chapter built entirely from a fact-free template).
    perspectiveCards = [];
    for (let i = 0; i < factScript.chapters.length; i++) {
      if (factScript.chapters[i].insufficientData) continue;
      const card = await writeDocumentaryCard(resolved, factScript.chapters[i], i, perspectiveCards, diagnostics);
      if (card) perspectiveCards.push(card);
    }

    // Phase 10: Style Polish
    const polished = await polishDocumentary(resolved, briefSummaryText, perspectiveCards, diagnostics);
    briefSummaryText = sanitizeBannedWords(polished.summary);
    perspectiveCards = polished.cards.map(c => ({
      ...c,
      summary: sanitizeBannedWords(c.summary),
      keyTakeaway: sanitizeBannedWords(c.keyTakeaway),
      provenance: c.provenance ? c.provenance.map(p => ({
        sentence: sanitizeBannedWords(p.sentence),
        fact: sanitizeBannedWords(p.fact)
      })) : []
    }));

    // Re-map summary provenance sentences if style polish changed them slightly
    if (briefSummaryProvenance && polished.summary !== summaryData.summary) {
      const origSentences = summaryData.summary.split(/(?<=[.!?])\s+/).filter(Boolean);
      const polishedSentences = briefSummaryText.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (origSentences.length === polishedSentences.length && briefSummaryProvenance.length === polishedSentences.length) {
        briefSummaryProvenance = briefSummaryProvenance.map((p, idx) => ({
          sentence: sanitizeBannedWords(polishedSentences[idx]),
          fact: sanitizeBannedWords(p.fact)
        }));
      }
    }

    triviaCandidates = compiled.triviaCandidates;
  } else {
    console.log(`[DAG] Incremental cache hit for "${resolved.canonicalTitle}". Reusing cached sub-stages.`);
    // Reuse from cache
    compiled = {
      structuredFacts: cached!.structuredFacts,
      namedEntities: cached!.namedEntities,
      timeline: cached!.timeline,
      triviaCandidates: cached!.triviaCandidates,
      relatedTopics: cached!.relatedTopics,
      sourceSections: cached!.sourceReferences.map(ref => ({ title: ref.title, content: "" })),
      fallbackFieldNames: [],
    };
    knowledgeGraph = cached!.knowledgeGraph;
    rankedFacts = cached!.rankedFacts;
    timeline = cached!.timeline;
    triviaCandidates = cached!.triviaCandidates;
    narrativePlan = cached!.narrativePlan;
    factScript = cached!.factScript;
    briefSummaryProvenance = cached!.briefSummaryProvenance;
    editorialBriefProvenance = cached!.editorialBriefProvenance;
    perspectiveCards = (cached!.structuredFacts.cards || []) as PerspectiveCard[];
    briefSummaryText = cached!.structuredFacts.briefSummary || "";
    editorialBriefText = cached!.structuredFacts.editorialBrief || "";
    totalChaptersPlanned = narrativePlan.chapters.length;
    insufficientChapterCount = (factScript?.chapters || []).filter((c) => c.insufficientData).length;
  }

  // Visual modules construction
  const ontology = mapEntityTypeToOntology(resolved.entityType);
  const visualModules: VisualModule[] = [
    {
      type: ontology.name.toLowerCase().replace(/\s+/g, "_"),
      title: `${ontology.name} Blueprint Snapshot`,
      data: compiled.structuredFacts
    }
  ];

  // Quality assessment — every number here is computed from a real,
  // independently-inspectable signal (provenance coverage, field coverage,
  // placeholder count, fallback ratio, graph/timeline validity, etc.).
  // This replaces the hardcoded `compiler: 0.95` / `overall: 0.92` literals
  // the V17 forensic audit found in this exact spot
  // (V17_FORENSIC_AUDIT.md, Bug #1). On a cache hit, the cached assessment
  // is reused rather than recomputed against data that wasn't regenerated.
  const qualityAssessment = needsRecompilation
    ? assessArtifactQuality({
        resolved,
        ontology,
        structuredFacts: compiled.structuredFacts,
        fallbackFieldNames: compiled.fallbackFieldNames || [],
        namedEntities: compiled.namedEntities,
        knowledgeGraph,
        timeline,
        rankedFacts,
        triviaCandidates,
        relatedTopics: compiled.relatedTopics,
        cards: perspectiveCards,
        totalChaptersPlanned,
        insufficientChapterCount,
        briefSummary: briefSummaryText,
        briefSummaryProvenance: briefSummaryProvenance || [],
        diagnostics,
      })
    : cached!.qualityAssessment;

  const confidenceScores = deriveConfidenceScores(resolved, qualityAssessment);

  // Stage 4: Compile into Canonical Knowledge Artifact
  const artifactPayload: Omit<KnowledgeArtifact, "validationStatus"> = {
    version: "19.0",
    compilerVersion: COMPILER_VERSION,
    ontologyVersion: ONTOLOGY_VERSION,
    wikipediaRevision,
    wikidataRevision: resolved.wikidataId || "wd-unknown",
    ontology: {
      name: ontology.name,
      labels: [resolved.entityType, ontology.name]
    },
    structuredFacts: {
      ...compiled.structuredFacts,
      title: resolved.canonicalTitle,
      subtitle: article.description || "",
      leadParagraph: article.lead,
      briefSummary: briefSummaryText,
      editorialBrief: editorialBriefText,
      cards: perspectiveCards
    },
    namedEntities: compiled.namedEntities,
    knowledgeGraph,
    timeline,
    rankedFacts,
    visualModules,
    narrativePlan,
    triviaCandidates,
    relatedTopics: compiled.relatedTopics,
    confidenceScores,
    qualityAssessment,
    stageDiagnostics: needsRecompilation ? diagnostics : cached!.stageDiagnostics || [],
    checksum: sourceTextChecksum,
    dependencyHash: currentDependencyHash,
    sourceReferences: [
      { url: article.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(resolved.canonicalTitle)}`, title: resolved.canonicalTitle }
    ],
    factScript,
    briefSummaryProvenance: briefSummaryProvenance ? briefSummaryProvenance.map(p => ({
      sentence: sanitizeBannedWords(p.sentence),
      fact: sanitizeBannedWords(p.fact)
    })) : undefined,
    editorialBriefProvenance: editorialBriefProvenance ? editorialBriefProvenance.map(p => ({
      sentence: sanitizeBannedWords(p.sentence),
      fact: sanitizeBannedWords(p.fact)
    })) : undefined
  };

  // Step 10: Stage 8 Knowledge Linter validation
  const lintReport = lintArtifact(artifactPayload);

  // A linter failure can only downgrade the quality gate's own verdict,
  // never upgrade it.
  const reconciledAssessment = reconcileWithLintReport(qualityAssessment, lintReport.passed);

  const finalArtifact: KnowledgeArtifact = {
    ...artifactPayload,
    qualityAssessment: reconciledAssessment,
    validationStatus: lintReport
  };

  // Cache write protection: a FAIL is never cached, and a worse artifact
  // can never silently overwrite a better one already on disk — see
  // src/lib/knowledge/cacheGuard.ts. This closes the mechanism behind the
  // V17 forensic audit's headline finding: a recompilation that fell back
  // harder than the cached artifact could previously still overwrite it,
  // because `lintReport.passed` alone was achievable by fallback content.
  if (needsRecompilation) {
    const decision = shouldAcceptWrite(cached, finalArtifact);
    if (decision.accepted) {
      saveLocalArtifact(finalArtifact);
      console.log(`[DAG] Cache write accepted for "${resolved.canonicalTitle}": ${decision.reason}`);
    } else {
      console.log(`[DAG] Cache write REJECTED for "${resolved.canonicalTitle}": ${decision.reason}`);
    }
  }

  return finalArtifact;
}
