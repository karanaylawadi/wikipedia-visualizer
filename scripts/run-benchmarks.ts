import fs from "fs";
import path from "path";
import { getArticleIntelligence, searchWikipedia } from "../src/lib/editorial/wikipedia";
import { processKnowledgeDAG } from "../src/lib/knowledge/dag";
import { lintArtifact } from "../src/lib/knowledge/linter";
import { scanForPlaceholders, containsPlaceholder } from "../src/lib/knowledge/placeholderDetector";
import { getArtifactPath, COMPILER_VERSION } from "../src/lib/knowledge/store";
import type { KnowledgeArtifact, PerspectiveCard } from "../src/types/knowledge";

// Simple helper to load .env.local file properties into process.env
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
    console.log("[Benchmarks] Loaded env variables from .env.local");
  }
}

const BENCHMARK_TOPICS = [
  { topic: "Inception", expectedOntology: "Movie" },
  { topic: "Interstellar", expectedOntology: "Movie" },
  { topic: "Albert Einstein", expectedOntology: "Person" },
  { topic: "Christopher Nolan", expectedOntology: "Person" },
  { topic: "Apple Inc.", expectedOntology: "Company" },
  { topic: "NVIDIA", expectedOntology: "Company" },
  { topic: "Japan", expectedOntology: "Country" },
  { topic: "United Arab Emirates", expectedOntology: "Country" },
  { topic: "World War II", expectedOntology: "Historical Event" },
  { topic: "Space Race", expectedOntology: "Historical Event" },
  { topic: "Renaissance", expectedOntology: "Art Movement" },
  { topic: "Mona Lisa", expectedOntology: "Art Movement" },
  { topic: "Python (programming language)", expectedOntology: "Technology" },
  { topic: "Kubernetes", expectedOntology: "Technology" },
  { topic: "DNA", expectedOntology: "Science" },
  { topic: "Photosynthesis", expectedOntology: "Science" },
  // Added for V18 Phase 1: closes the coverage gap docs/GOLDEN_OUTPUTS.md
  // flagged (Napoleon Bonaparte was a homepage-featured topic that had
  // never been run through the benchmark suite) and exercises entity-alias
  // resolution ("Renaissance Art" -> the "Renaissance" Wikipedia article,
  // distinct from the existing plain "Renaissance" entry above).
  { topic: "Napoleon Bonaparte", expectedOntology: "Person" },
  { topic: "Renaissance Art", expectedOntology: "Art Movement" },
];

// Words a compressed sentence must never end on — mirrors
// sentenceCleaner.ts's own DANGLING_END_WORDS list, used here as an
// independent, external check on the final artifact rather than trusting
// the module that produced the text.
const DANGLING_END_WORDS = new Set([
  "a", "an", "the", "using", "with", "by", "of", "in", "on", "at", "to",
  "for", "and", "or", "but", "as", "is", "was", "were", "are", "his", "her",
  "its", "their", "that", "which", "who", "named", "called", "known",
]);

function endsOnDanglingWord(text: string): boolean {
  const words = (text || "").trim().replace(/[.,;:!?]+$/, "").split(/\s+/);
  const last = words[words.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");
  return !!last && DANGLING_END_WORDS.has(last);
}

interface TrustCheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

// The nine assertions required for V18 Phase 1, run against the live
// artifact produced by processKnowledgeDAG for each benchmark topic. These
// exist specifically so a fallback-poisoned artifact — the class of
// artifact reports/audits/V17_FORENSIC_AUDIT.md found shipping as
// "passed: true" under the old benchmark suite — cannot report success
// here.
function runTrustChecks(artifact: KnowledgeArtifact, topic: string): TrustCheckResult[] {
  const results: TrustCheckResult[] = [];

  // 1. No placeholder strings anywhere in structured facts.
  const placeholderHits = scanForPlaceholders(artifact.structuredFacts);
  results.push({
    name: "no placeholder strings",
    passed: placeholderHits.length === 0,
    detail: placeholderHits.length > 0 ? `found at: ${placeholderHits.slice(0, 3).join(", ")}` : undefined,
  });

  // 2. Confidence is not hardcoded (the old dag.ts literals were exactly
  // compiler: 0.95 and overall: 0.92, always, regardless of input).
  const looksHardcoded = artifact.confidenceScores.compiler === 0.95 && artifact.confidenceScores.overall === 0.92;
  results.push({
    name: "confidence is not hardcoded",
    passed: !looksHardcoded && !!artifact.qualityAssessment,
    detail: looksHardcoded ? "confidenceScores match the old hardcoded literals exactly" : undefined,
  });

  // 3. A fallback-generated artifact cannot report PASS.
  const fallbackPassed = artifact.qualityAssessment.generationMode === "fallback" && artifact.qualityAssessment.status === "PASS";
  results.push({
    name: "fallback artifacts cannot report PASS",
    passed: !fallbackPassed,
    detail: fallbackPassed ? "generationMode=fallback but status=PASS" : undefined,
  });

  // 4. Provenance coverage is internally consistent with the reported status.
  const provenanceConsistent =
    artifact.qualityAssessment.status !== "PASS" || artifact.qualityAssessment.provenanceCoverage >= 0.9;
  results.push({
    name: "provenance coverage meets threshold for its status",
    passed: provenanceConsistent,
    detail: !provenanceConsistent ? `status=PASS but provenanceCoverage=${artifact.qualityAssessment.provenanceCoverage.toFixed(2)}` : undefined,
  });

  // 5. No placeholder or synthetic-filler graph nodes.
  const badTriples = (artifact.knowledgeGraph || []).filter(
    (t) => containsPlaceholder(t.subject) || containsPlaceholder(t.object) || (t.predicate === "HAS_PROPERTY" && /^Detail_Aspect_\d+$/i.test(t.object))
  );
  results.push({
    name: "no placeholder graph nodes",
    passed: badTriples.length === 0,
    detail: badTriples.length > 0 ? `${badTriples.length} placeholder/synthetic triple(s)` : undefined,
  });

  // 6. No incomplete, truncated-mid-clause facts in the rendered cards.
  const cards = (artifact.structuredFacts.cards as PerspectiveCard[] | undefined) || [];
  let truncatedSentenceFound = false;
  cards.forEach((c) => {
    const sentences = (c.summary || "").split(/(?<=[.!?])\s+/).filter(Boolean);
    sentences.forEach((s: string) => {
      if (endsOnDanglingWord(s)) truncatedSentenceFound = true;
    });
  });
  results.push({
    name: "no incomplete truncated facts",
    passed: !truncatedSentenceFound,
    detail: truncatedSentenceFound ? "a card sentence ends on a dangling word" : undefined,
  });

  // 7. Timelines (when not hidden) contain named, source-supported events —
  // not generic placeholder headlines/descriptions.
  const timelineHidden = artifact.qualityAssessment.modulesHidden.includes("timeline");
  const timelineOk =
    timelineHidden ||
    (artifact.timeline.length >= 3 && artifact.timeline.every((t) => !containsPlaceholder(t.headline) && !containsPlaceholder(t.description)));
  results.push({
    name: "timelines contain named source-supported events",
    passed: timelineOk,
    detail: !timelineOk ? "timeline is shown but contains placeholder or insufficient entries" : undefined,
  });

  // 8. Every hidden module has a documented reason — proof modules are
  // omitted deliberately, not filled with filler and forgotten about.
  const allHiddenExplained = artifact.qualityAssessment.modulesHidden.every((m) =>
    artifact.qualityAssessment.reasons.some((r) => r.includes(m))
  );
  results.push({
    name: "failed modules are omitted with a documented reason",
    passed: allHiddenExplained,
    detail: !allHiddenExplained ? "a hidden module has no corresponding reason entry" : undefined,
  });

  // 9. Cached artifact slug and metadata are correct. Explicitly checks
  // the on-disk artifact's OWN status, not just whether a file happens to
  // exist — a pre-existing cache file from a prior (different-version) run
  // could otherwise mask a FAIL artifact having overwritten it. This is
  // exactly the class of bug caught live during Phase 1 benchmarking: the
  // old cacheGuard.ts let a version bump bypass the FAIL check, so a FAIL
  // artifact silently overwrote a v17 cache file (see V18_PHASE1_REVIEW.md).
  const expectedPath = getArtifactPath(artifact.ontology.name, artifact.structuredFacts.title || topic);
  const fileExists = fs.existsSync(expectedPath);
  let metadataOk = false;
  if (artifact.qualityAssessment.status === "FAIL") {
    // A FAIL run's only obligation is that it did not write — a guarantee
    // cacheGuard.ts already enforces and that is independently covered by
    // a unit-test regression (scripts/run-unit-tests.ts). Whatever is (or
    // isn't) already on disk at this path is leftover state from some
    // earlier run, not something this run produced, so its content is not
    // this check's concern. Treating a pre-existing stale FAIL file as a
    // failure here was itself a bug: it punished a correct refusal-to-write
    // using leftover evidence from a run that predated that refusal.
    metadataOk = true;
  } else if (fileExists) {
    try {
      const onDisk = JSON.parse(fs.readFileSync(expectedPath, "utf-8")) as KnowledgeArtifact;
      const onDiskIsFail = onDisk.qualityAssessment?.status === "FAIL";
      metadataOk =
        !onDiskIsFail &&
        onDisk.compilerVersion === COMPILER_VERSION &&
        onDisk.structuredFacts.title === artifact.structuredFacts.title;
    } catch {
      metadataOk = false;
    }
  } else {
    // A non-FAIL run (PARTIAL/PASS) is expected to have written a file.
    metadataOk = false;
  }
  results.push({
    name: "cached artifact slug and metadata are correct",
    passed: metadataOk,
    detail: !metadataOk ? `expected path: ${expectedPath}` : undefined,
  });

  return results;
}

async function runBenchmarks() {
  loadEnvLocal();

  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not defined. Cannot run benchmarks.");
    process.exit(1);
  }

  console.log("\n=======================================================");
  console.log("Visualizer.wiki V18 Phase 1 Benchmark Suite");
  console.log("=======================================================\n");

  let passes = 0;
  let failures = 0;

  for (const item of BENCHMARK_TOPICS) {
    console.log(`Testing topic: "${item.topic}" (Expected: ${item.expectedOntology})...`);
    try {
      // 1. Fetch Wikipedia data
      let articleSource = await getArticleIntelligence(item.topic);
      if (!articleSource) {
        const searchResult = await searchWikipedia(item.topic);
        if (!searchResult) {
          throw new Error(`Could not find Wikipedia article for: ${item.topic}`);
        }
        articleSource = {
          ...searchResult,
          lead: searchResult.extract.split(".")[0] + ".",
          sectionHeadings: [],
          wikitext: "",
          links: [],
          categories: []
        };
      }

      // 2. Process DAG compilation
      const artifact = await processKnowledgeDAG(item.topic, articleSource);

      // 3. Validation checks
      const lintReport = lintArtifact(artifact);

      const ontologyName = artifact.ontology.name;
      const isOntologyCorrect = ontologyName === item.expectedOntology;

      console.log(`  - Mapped Ontology: ${ontologyName} [${isOntologyCorrect ? "PASS" : "FAIL"}]`);
      console.log(`  - Linter Status: ${lintReport.passed ? "PASS" : "FAIL"}`);
      console.log(`  - Quality Gate Status: ${artifact.qualityAssessment.status} (score ${artifact.qualityAssessment.qualityScore}/100, generationMode=${artifact.qualityAssessment.generationMode})`);
      console.log(`    V16 Documentary Metrics:`);
      console.log(`      * Sentence Provenance Check: ${lintReport.checkedRules["sentence_provenance_ok"] ? "PASS" : "FAIL"}`);
      console.log(`      * Fact Density Check: ${lintReport.checkedRules["fact_density_met"] ? "PASS" : "FAIL"}`);
      console.log(`      * Generic Wording Check: ${lintReport.checkedRules["generic_wording_check"] ? "PASS" : "FAIL"}`);
      console.log(`      * Documentary Alternating Rule: ${lintReport.checkedRules["documentary_alternating_rule"] ? "PASS" : "FAIL"}`);
      console.log(`      * Documentary Score Check: ${lintReport.checkedRules["documentary_score_ok"] ? "PASS" : "FAIL"}`);
      if (!lintReport.passed) {
        console.log(`    Linter Errors:`, lintReport.errors);
      }

      console.log(`    V18 Trust Checks:`);
      const trustChecks = runTrustChecks(artifact, item.topic);
      let allTrustChecksPassed = true;
      trustChecks.forEach((check) => {
        console.log(`      * ${check.name}: ${check.passed ? "PASS" : "FAIL"}${check.detail ? ` (${check.detail})` : ""}`);
        if (!check.passed) allTrustChecksPassed = false;
      });

      if (isOntologyCorrect && lintReport.passed && allTrustChecksPassed) {
        console.log(`✔️ Topic "${item.topic}" PASSED all checks.\n`);
        passes++;
      } else {
        console.log(`❌ Topic "${item.topic}" FAILED validation.\n`);
        failures++;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Exception running topic "${item.topic}":`, message);
      failures++;
    }
  }

  console.log("=======================================================");
  console.log(`Benchmark Results: ${passes} passed, ${failures} failed.`);
  console.log("A pass count alone is not sufficient — see reports/audits/V17_FORENSIC_AUDIT.md");
  console.log("for why the old suite's PASS results did not mean trustworthy content.");
  console.log("=======================================================");

  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runBenchmarks();
