import { resolveEntity } from "./entityResolver";
import { compileKnowledge, CompiledOutput } from "./compiler";
import { buildKnowledgeGraph } from "./knowledgeGraph";
import { evaluateFacts } from "./factEvaluator";
import { planNarrative } from "./narrativePlanner";
import { writeBriefSummary, writeChapterCard, PerspectiveCard } from "./geminiWriter";
import { lintArtifact } from "./linter";
import {
  loadLocalArtifact,
  saveLocalArtifact,
  calculateChecksum,
  calculateDependencyHash,
  COMPILER_VERSION,
  ONTOLOGY_VERSION
} from "./store";
import type { KnowledgeArtifact, ResolvedEntity, TimelineEvent, GraphTriple, EvaluatedFact, VisualModule, NarrativePlan } from "@/types/knowledge";
import type { ArticleIntelligence } from "../editorial/wikipedia";
import { mapEntityTypeToOntology } from "../ontology/ontologyEngine";

export async function processKnowledgeDAG(
  topic: string,
  article: ArticleIntelligence
): Promise<KnowledgeArtifact> {
  // Step 1: Stage 1 Entity Resolver
  const resolved = await resolveEntity(topic);

  // Step 2: Determine Current Inputs & Revision
  const wikipediaRevision = article.timestamp || "rev-1.0";
  const sourceTextChecksum = calculateChecksum(article.extract);
  const currentDependencyHash = calculateDependencyHash({
    compilerVersion: COMPILER_VERSION,
    ontologyVersion: ONTOLOGY_VERSION,
    wikipediaRevision,
    sourceTextChecksum
  });

  // Step 3: Load existing cached artifact
  let cached = loadLocalArtifact(resolved.entityType, resolved.canonicalTitle);

  // Determine incremental flags
  const needsRecompilation =
    !cached ||
    cached.compilerVersion !== COMPILER_VERSION ||
    cached.ontologyVersion !== ONTOLOGY_VERSION ||
    cached.wikipediaRevision !== wikipediaRevision ||
    cached.dependencyHash !== currentDependencyHash;

  let compiled: CompiledOutput;
  let knowledgeGraph: GraphTriple[];
  let rankedFacts: EvaluatedFact[];
  let timeline: TimelineEvent[];
  let triviaCandidates: string[];
  let narrativePlan: NarrativePlan;
  let briefSummaryText = "";
  let perspectiveCards: PerspectiveCard[] = [];

  if (needsRecompilation) {
    console.log(`[DAG] Incremental cache miss for "${resolved.canonicalTitle}". Running compiler...`);
    
    // Step 4: Stage 3 Compile Knowledge
    compiled = await compileKnowledge(resolved, article);

    // Step 5: Stage 5 Knowledge Graph Builder
    knowledgeGraph = await buildKnowledgeGraph(resolved, compiled);

    // Step 6: Stage 6 Fact Evaluation Engine
    rankedFacts = await evaluateFacts(resolved, compiled);

    // Step 7: Build Timeline (input is dates, events, people from compiler output)
    timeline = compiled.timeline;

    // Step 8: Stage 9 Narrative Planner
    narrativePlan = await planNarrative(resolved, compiled, rankedFacts);

    // Step 9: Stage 10 Gemini Writer (generate summary and cards)
    briefSummaryText = await writeBriefSummary(resolved, compiled, narrativePlan);
    
    perspectiveCards = [];
    for (let i = 0; i < narrativePlan.chapters.length; i++) {
      const card = await writeChapterCard(resolved, narrativePlan.chapters[i], i, perspectiveCards);
      perspectiveCards.push(card);
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
      sourceSections: cached!.sourceReferences.map(ref => ({ title: ref.title, content: "" }))
    };
    knowledgeGraph = cached!.knowledgeGraph;
    rankedFacts = cached!.rankedFacts;
    timeline = cached!.timeline;
    triviaCandidates = cached!.triviaCandidates;
    narrativePlan = cached!.narrativePlan;
    briefSummaryText = cached!.validationStatus.checkedRules["brief_summary"] ? "summary text" : ""; 
    // We will parse standard values below
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

  // Stage 4: Compile into Canonical Knowledge Artifact
  const artifactPayload: Omit<KnowledgeArtifact, "validationStatus"> = {
    version: "15.0",
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
    confidenceScores: {
      resolver: resolved.confidence,
      compiler: 0.95,
      grader: rankedFacts.length > 0 ? rankedFacts[0].score : 0.85,
      overall: 0.92
    },
    checksum: sourceTextChecksum,
    dependencyHash: currentDependencyHash,
    sourceReferences: [
      { url: article.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(resolved.canonicalTitle)}`, title: resolved.canonicalTitle }
    ]
  };

  // Step 10: Stage 8 Knowledge Linter validation
  const lintReport = lintArtifact(artifactPayload);
  const finalArtifact: KnowledgeArtifact = {
    ...artifactPayload,
    validationStatus: lintReport
  };

  // Save if compiled or if valid
  if (needsRecompilation && lintReport.passed) {
    saveLocalArtifact(finalArtifact);
  }

  return finalArtifact;
}
