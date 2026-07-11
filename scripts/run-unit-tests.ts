// Dependency-free unit tests for V18 Phase 1's trustworthy-artifact
// modules. Uses Node's built-in assert module, run via the already-
// installed `tsx` — no new test framework dependency, matching the style
// of scripts/run-benchmarks.ts (manual assertions, console output,
// process.exit on failure).
//
// Run with: npx tsx scripts/run-unit-tests.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { containsPlaceholder, isPlaceholderValue, scanForPlaceholders } from "../src/lib/knowledge/placeholderDetector";
import { cleanSentence, cleanFragment } from "../src/lib/knowledge/sentenceCleaner";
import { assessArtifactQuality, type QualityGateInput } from "../src/lib/knowledge/qualityGate";
import { shouldAcceptWrite } from "../src/lib/knowledge/cacheGuard";
import { validateTriple } from "../src/lib/knowledge/knowledgeGraph";
import {
  validateEditorialBriefText,
  EDITORIAL_BRIEF_MAX_WORDS,
} from "../src/lib/knowledge/documentaryWriter";
import type { KnowledgeArtifact, ResolvedEntity, OntologyDefinition, TimelineEvent } from "../src/types/knowledge";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
    passed++;
  } catch (error) {
    console.error(`  ✘ ${name}`);
    console.error(`      ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

// ---------------------------------------------------------------------
console.log("\n=== Placeholder Detection ===");
// ---------------------------------------------------------------------

test("detects 'Compiled detail for' exactly", () => {
  assert.equal(containsPlaceholder("Compiled detail for director"), true);
});
test("detects 'Pivotal era' timeline pattern", () => {
  assert.equal(containsPlaceholder("Pivotal era in 1957"), true);
});
test("detects 'Significant milestone'", () => {
  assert.equal(containsPlaceholder("A significant milestone occurred"), true);
});
test("detects the 'underwent core changes... major development' pattern", () => {
  assert.equal(containsPlaceholder("Japan underwent core changes and reached major development in 2026"), true);
});
test("detects 'Historical importance'", () => {
  assert.equal(containsPlaceholder("This has historical importance"), true);
});
test("detects 'Topic-specific brief'", () => {
  assert.equal(containsPlaceholder("A topic-specific brief summary"), true);
});
test("detects 'Foundational detail'", () => {
  assert.equal(containsPlaceholder("Foundational detail about the subject"), true);
});
test("detects 'General overview'", () => {
  assert.equal(containsPlaceholder("A general overview of the topic"), true);
});
test("detects 'Notable progression'", () => {
  assert.equal(containsPlaceholder("Notable progression through history"), true);
});
test("detects 'Significant Item N' array placeholder", () => {
  assert.equal(isPlaceholderValue(["Significant Item 1", "Significant Item 2"]), true);
});
test("does not flag a real, specific sentence", () => {
  assert.equal(containsPlaceholder("Christopher Nolan directed Inception in 2010."), false);
});
test("does not flag a mixed array with at least one real value", () => {
  assert.equal(isPlaceholderValue(["Leonardo DiCaprio", "Significant Item 2"]), false);
});
test("scanForPlaceholders finds nested placeholder paths", () => {
  const hits = scanForPlaceholders({ a: { b: "Compiled detail for x" }, c: ["ok", "Pivotal era in 1957"] });
  assert.equal(hits.length, 2);
});

// ---------------------------------------------------------------------
console.log("\n=== Sentence-Aware Fact Cleaning ===");
// ---------------------------------------------------------------------

test("Japan kanji regression: does not cut the sentence before 日本", () => {
  const raw = "The name for Japan in Japanese is written using the kanji 日本 and is pronounced Nihon or Nippon.";
  const cleaned = cleanSentence(raw);
  assert.ok(cleaned.includes("日本"), `expected cleaned sentence to include 日本, got: "${cleaned}"`);
});
test("does not end on a dangling preposition ('using')", () => {
  const raw = "Dom Cobb and Arthur are extractors who perform corporate espionage using experimental dream-sharing technology to infiltrate targets subconscious.";
  const cleaned = cleanSentence(raw, 10);
  const lastWord = cleaned.replace(/\.$/, "").split(/\s+/).pop()?.toLowerCase();
  assert.notEqual(lastWord, "using", `sentence ended on a dangling word: "${cleaned}"`);
});
test("preserves a trailing quoted named term rather than stranding it", () => {
  const raw = "Yusuf's sedatives will instead send them into a place called, \"Limbo\", a world of infinite subconscious.";
  const cleaned = cleanSentence(raw, 12);
  assert.ok(cleaned.includes("Limbo"), `expected cleaned sentence to retain "Limbo", got: "${cleaned}"`);
});
test("short sentences are returned whole and complete", () => {
  const raw = "Sputnik 1 launched in 1957.";
  const cleaned = cleanSentence(raw);
  assert.ok(cleaned.includes("Sputnik 1") && cleaned.includes("1957"), `got: "${cleaned}"`);
});
test("never returns a fragment ending mid-word or with no terminal punctuation", () => {
  const raw = "A long sentence with many clauses, describing several distinct historical events, each connected by conjunctions, and ending with a specific named entity such as the Tokugawa shogunate.";
  const cleaned = cleanSentence(raw, 12);
  assert.ok(/[.!?]$/.test(cleaned), `expected a terminal punctuation mark, got: "${cleaned}"`);
});
test("cleanFragment never returns an empty string for real input", () => {
  assert.notEqual(cleanFragment("Napoleon was born in Corsica in 1769."), "");
});

// ---------------------------------------------------------------------
console.log("\n=== Knowledge Graph Node Validation ===");
// ---------------------------------------------------------------------

test("rejects a placeholder-subject triple", () => {
  const seen = new Set<string>();
  assert.equal(validateTriple({ subject: "Compiled detail for director", predicate: "DIRECTED", object: "Inception" }, seen), false);
});
test("rejects a self-relation", () => {
  const seen = new Set<string>();
  assert.equal(validateTriple({ subject: "Inception", predicate: "RELATED_TO", object: "Inception" }, seen), false);
});
test("rejects synthetic HAS_PROPERTY/Detail_Aspect_N filler", () => {
  const seen = new Set<string>();
  assert.equal(validateTriple({ subject: "Space Race", predicate: "HAS_PROPERTY", object: "Detail_Aspect_1" }, seen), false);
});
test("rejects a duplicate triple on the second occurrence", () => {
  const seen = new Set<string>();
  assert.equal(validateTriple({ subject: "Nolan", predicate: "DIRECTED", object: "Inception" }, seen), true);
  assert.equal(validateTriple({ subject: "Nolan", predicate: "DIRECTED", object: "Inception" }, seen), false);
});
test("rejects an empty label", () => {
  const seen = new Set<string>();
  assert.equal(validateTriple({ subject: "", predicate: "DIRECTED", object: "Inception" }, seen), false);
});
test("accepts a valid, specific, non-duplicate triple", () => {
  const seen = new Set<string>();
  assert.equal(validateTriple({ subject: "Christopher Nolan", predicate: "DIRECTED", object: "Inception" }, seen), true);
});

// ---------------------------------------------------------------------
console.log("\n=== Cache Write Comparison ===");
// ---------------------------------------------------------------------

function fakeArtifact(opts: {
  qualityScore: number;
  status?: "PASS" | "PARTIAL" | "FAIL";
  compilerVersion?: string;
  ontologyVersion?: string;
  wikipediaRevision?: string;
  placeholderCount?: number;
  provenanceCoverage?: number;
  verifiedFactRatio?: number;
  fallbackRatio?: number;
}): KnowledgeArtifact {
  const fake = {
    compilerVersion: opts.compilerVersion || "v18.0",
    ontologyVersion: opts.ontologyVersion || "v18.0",
    wikipediaRevision: opts.wikipediaRevision || "rev-1.0",
    qualityAssessment: {
      generationMode: "primary" as const,
      fallbackRatio: opts.fallbackRatio ?? 0,
      provenanceCoverage: opts.provenanceCoverage ?? 1,
      placeholderCount: opts.placeholderCount ?? 0,
      verifiedFactRatio: opts.verifiedFactRatio ?? 1,
      qualityScore: opts.qualityScore,
      status: opts.status || "PASS",
      modulesPassing: [],
      modulesHidden: [],
      reasons: [],
      confidenceBreakdown: {
        provenanceCoverage: 1, fieldCoverage: 1, placeholderPenalty: 1, fallbackPenalty: 1,
        sourceAgreement: 1, extractionCompleteness: 1, factSpecificity: 1, graphValidity: 1,
        timelineValidity: 1, validationPenalty: 1,
      },
    },
  };
  return fake as unknown as KnowledgeArtifact;
}

test("no existing artifact: write is always accepted", () => {
  const decision = shouldAcceptWrite(null, fakeArtifact({ qualityScore: 50 }));
  assert.equal(decision.accepted, true);
});
test("a lower-quality candidate does not overwrite a higher-quality cached artifact", () => {
  const existing = fakeArtifact({ qualityScore: 80 });
  const candidate = fakeArtifact({ qualityScore: 40 });
  assert.equal(shouldAcceptWrite(existing, candidate).accepted, false);
});
test("a FAIL candidate is never accepted, even over a worse cached artifact", () => {
  const existing = fakeArtifact({ qualityScore: 10, status: "FAIL" });
  const candidate = fakeArtifact({ qualityScore: 90, status: "FAIL" });
  assert.equal(shouldAcceptWrite(existing, candidate).accepted, false);
});
test("a version bump is accepted regardless of relative quality", () => {
  const existing = fakeArtifact({ qualityScore: 95, compilerVersion: "v17.0" });
  const candidate = fakeArtifact({ qualityScore: 20, compilerVersion: "v18.0" });
  assert.equal(shouldAcceptWrite(existing, candidate).accepted, true);
});
test("regression: a version bump does NOT bypass the FAIL check", () => {
  // Caught live during Phase 1 benchmarking (zero-quota Gemini key forced
  // every topic to FAIL): the version-bump branch used to return early
  // before the FAIL check ever ran, so a v18 FAIL recompile silently
  // overwrote a cached v17 artifact. See V18_PHASE1_REVIEW.md.
  const existing = fakeArtifact({ qualityScore: 30, compilerVersion: "v17.0" });
  const candidate = fakeArtifact({ qualityScore: 39, compilerVersion: "v18.0", status: "FAIL" });
  const decision = shouldAcceptWrite(existing, candidate);
  assert.equal(decision.accepted, false, `expected a FAIL candidate to be rejected even on a version bump, got: ${decision.reason}`);
});
test("a FAIL candidate with no existing cache is still rejected", () => {
  const candidate = fakeArtifact({ qualityScore: 39, status: "FAIL" });
  assert.equal(shouldAcceptWrite(null, candidate).accepted, false);
});
test("an equal-or-better candidate is accepted", () => {
  const existing = fakeArtifact({ qualityScore: 60 });
  const candidate = fakeArtifact({ qualityScore: 75 });
  assert.equal(shouldAcceptWrite(existing, candidate).accepted, true);
});
test("equal score but more placeholder contamination is rejected", () => {
  const existing = fakeArtifact({ qualityScore: 60, placeholderCount: 0 });
  const candidate = fakeArtifact({ qualityScore: 60, placeholderCount: 3 });
  assert.equal(shouldAcceptWrite(existing, candidate).accepted, false);
});

// ---------------------------------------------------------------------
console.log("\n=== Confidence Calculation & PASS / PARTIAL / FAIL Classification ===");
// ---------------------------------------------------------------------

const baseOntology: OntologyDefinition = {
  name: "Test",
  requiredFields: ["fieldA", "fieldB"],
  requiredEntities: [],
  timelineSchema: { minEvents: 3, maxEvents: 8 },
  documentaryBlueprint: ["One", "Two"],
  triviaStrategy: "",
  validationRules: [],
};

const baseResolved: ResolvedEntity = {
  entityType: "Test", confidence: 0.9, reasoning: "direct match", wikipediaPageId: 1,
  canonicalTitle: "Test Topic", aliases: [],
};

const baseTimeline: TimelineEvent[] = [
  { year: "2001", headline: "Real event one", description: "A real, specific description of event one.", importance: 8, connections: [], image: null },
  { year: "2002", headline: "Real event two", description: "A real, specific description of event two.", importance: 8, connections: [], image: null },
  { year: "2003", headline: "Real event three", description: "A real, specific description of event three.", importance: 8, connections: [], image: null },
];

function baseInput(overrides: Partial<QualityGateInput> = {}): QualityGateInput {
  return {
    resolved: baseResolved,
    ontology: baseOntology,
    structuredFacts: { fieldA: "A real, specific value.", fieldB: "Another real, specific value." },
    fallbackFieldNames: [],
    namedEntities: [{ name: "Someone Real", type: "Person" }],
    knowledgeGraph: [{ subject: "Someone Real", predicate: "CREATED", object: "Test Topic" }],
    timeline: baseTimeline,
    rankedFacts: [
      {
        fact: "A specific fact from 2001 about Test Topic.",
        score: 0.8,
        metrics: { confidence: 0.8, specificity: 0.9, narrativeValue: 0.8, educationalValue: 0.8, visualValue: 0.7, uniqueness: 0.7, ontologyRelevance: 0.9 },
      },
    ],
    triviaCandidates: [{ fact: "A surprising, real, specific fact.", surpriseScore: 8 }],
    relatedTopics: ["Related Topic One"],
    cards: [
      {
        title: "Card One",
        summary: "A real summary sentence about Test Topic.",
        referenceLabel: "One",
        readerQuestion: "What defines the one of Test Topic?",
        keyTakeaway: "A real takeaway.",
        provenance: [{ sentence: "A real summary sentence about Test Topic.", fact: "A specific fact from 2001 about Test Topic." }],
      },
    ],
    totalChaptersPlanned: 2,
    insufficientChapterCount: 0,
    briefSummary: "A real summary sentence about Test Topic.",
    briefSummaryProvenance: [{ sentence: "A real summary sentence about Test Topic.", fact: "A specific fact from 2001 about Test Topic." }],
    diagnostics: [
      { stage: "compiler", provider: "gemini", configuredModel: "gemini-2.0-flash",
selectedModel: "gemini-2.0-flash",
modelValidationAttempted: true,
modelValidationSucceeded: true,
supportedGenerationMethod: true,
requestAttempted: true,
requestSucceeded: true,
failureReason: null,
errorCategory: null,
quotaError: false,
deprecatedOrUnavailableModel: false,
fallbackModelUsed: false,
fallbackContentUsed: false, durationMs: 100 },
    ],
    ...overrides,
  };
}

test("a fully-primary, fully-covered, unpolluted artifact can reach PASS", () => {
  const result = assessArtifactQuality(baseInput());
  assert.equal(result.status, "PASS");
});

test("a fallback-only artifact never reaches PASS", () => {
  const result = assessArtifactQuality(
    baseInput({
      structuredFacts: {},
      fallbackFieldNames: ["fieldA", "fieldB"],
      knowledgeGraph: [],
      diagnostics: [
        { stage: "compiler", provider: "none", configuredModel: null, selectedModel: null, modelValidationAttempted: false, modelValidationSucceeded: false, supportedGenerationMethod: false, requestAttempted: false, requestSucceeded: false, failureReason: "no key", errorCategory: null, quotaError: false, deprecatedOrUnavailableModel: false, fallbackModelUsed: false, fallbackContentUsed: true, durationMs: 0 },
      ],
    })
  );
  assert.notEqual(result.status, "PASS");
  assert.equal(result.generationMode, "fallback");
});

test("placeholder contamination caps status below PASS even with otherwise-good coverage", () => {
  const result = assessArtifactQuality(
    baseInput({ structuredFacts: { fieldA: "Compiled detail for fieldA", fieldB: "Another real, specific value." } })
  );
  assert.notEqual(result.status, "PASS");
  assert.ok(result.placeholderCount > 0);
});

test("quality score is monotonically not lower for a more primary-generated artifact, all else equal", () => {
  const mostlyFallback = assessArtifactQuality(
    baseInput({
      diagnostics: [
        { stage: "compiler", provider: "none", configuredModel: null, selectedModel: null, modelValidationAttempted: false, modelValidationSucceeded: false, supportedGenerationMethod: false, requestAttempted: false, requestSucceeded: false, failureReason: "x", errorCategory: null, quotaError: false, deprecatedOrUnavailableModel: false, fallbackModelUsed: false, fallbackContentUsed: true, durationMs: 0 },
        { stage: "knowledgeGraph", provider: "none", configuredModel: null, selectedModel: null, modelValidationAttempted: false, modelValidationSucceeded: false, supportedGenerationMethod: false, requestAttempted: false, requestSucceeded: false, failureReason: "x", errorCategory: null, quotaError: false, deprecatedOrUnavailableModel: false, fallbackModelUsed: false, fallbackContentUsed: true, durationMs: 0 },
      ],
    })
  );
  const mostlyPrimary = assessArtifactQuality(baseInput());
  assert.ok(mostlyPrimary.qualityScore >= mostlyFallback.qualityScore, `expected ${mostlyPrimary.qualityScore} >= ${mostlyFallback.qualityScore}`);
});

test("an artifact with no cards hides the 'cards' module", () => {
  const result = assessArtifactQuality(baseInput({ cards: [] }));
  assert.ok(result.modulesHidden.includes("cards"));
});

test("a timeline with fewer than 3 valid entries hides the 'timeline' module", () => {
  const result = assessArtifactQuality(baseInput({ timeline: baseTimeline.slice(0, 1) }));
  assert.ok(result.modulesHidden.includes("timeline"));
});

test("a timeline with 3+ valid entries does not hide the 'timeline' module", () => {
  const result = assessArtifactQuality(baseInput());
  assert.ok(!result.modulesHidden.includes("timeline"));
});

test("an empty/absent knowledge graph hides the 'knowledgeGraph' module", () => {
  const result = assessArtifactQuality(baseInput({ knowledgeGraph: [] }));
  assert.ok(result.modulesHidden.includes("knowledgeGraph"));
});

// ---------------------------------------------------------------------
console.log("\n=== V19 Editorial Brief Validation ===");
// ---------------------------------------------------------------------

// 15 words per sentence, concrete and placeholder-free.
const BRIEF_SENTENCE =
  "In 1804 Napoleon Bonaparte crowned himself Emperor of the French at Notre-Dame in Paris.";
const briefParagraph = (sentences: number) => Array(sentences).fill(BRIEF_SENTENCE).join(" ");

test("hard maximum is 250 words", () => {
  assert.equal(EDITORIAL_BRIEF_MAX_WORDS, 250);
});

test("accepts a valid two-paragraph brief in the 180-250 word target range", () => {
  const brief = `${briefParagraph(8)}\n\n${briefParagraph(7)}`; // 120 + 105 = 225 words
  assert.equal(validateEditorialBriefText(brief).ok, true);
});

test("rejects a brief over the 250-word hard maximum", () => {
  const brief = `${briefParagraph(8)}\n\n${briefParagraph(8)}\n\n${briefParagraph(8)}`; // 360 words
  const verdict = validateEditorialBriefText(brief);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reason?.includes("hard maximum"));
});

test("rejects a brief too short to be a coherent briefing", () => {
  const verdict = validateEditorialBriefText(BRIEF_SENTENCE); // 15 words
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reason?.includes("too short"));
});

test("rejects any single paragraph over 130 words", () => {
  const brief = briefParagraph(10); // one 140-word paragraph (14 words/sentence)
  const verdict = validateEditorialBriefText(brief);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reason?.includes("paragraph exceeds"));
});

test("rejects headings inside the article", () => {
  const brief = `## Early Life\n\n${briefParagraph(8)}`;
  assert.equal(validateEditorialBriefText(brief).ok, false);
});

test("rejects bullet points inside the article", () => {
  const brief = `${briefParagraph(8)}\n\n- ${BRIEF_SENTENCE}`;
  assert.equal(validateEditorialBriefText(brief).ok, false);
});

test("rejects more than 3 paragraphs", () => {
  const brief = [briefParagraph(2), briefParagraph(2), briefParagraph(2), briefParagraph(2)].join("\n\n");
  const verdict = validateEditorialBriefText(brief);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reason?.includes("paragraphs"));
});

test("rejects placeholder-shaped content even at valid length", () => {
  const brief = `${briefParagraph(8)}\n\nPivotal era in 1957. ${briefParagraph(6)}`;
  const verdict = validateEditorialBriefText(brief);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reason?.includes("placeholder"));
});

test("rejects an empty brief (the never-fabricate contract)", () => {
  assert.equal(validateEditorialBriefText("").ok, false);
  assert.equal(validateEditorialBriefText("   ").ok, false);
});

// ---------------------------------------------------------------------
console.log("\n=== V19 Results-Page Render Contract (source scans) ===");
// ---------------------------------------------------------------------
// The project has no React render-test infrastructure (deliberately no
// jest/vitest dependency), so the render-tree guarantees are asserted
// against the page source itself: cruder than mounting the tree, but it
// fails loudly if someone re-introduces the removed modules or drops a
// conditional gate.

const resultsPageSource = fs.readFileSync(path.join(process.cwd(), "src/app/results/page.tsx"), "utf-8");
const knowledgeJourneySource = fs.readFileSync(path.join(process.cwd(), "src/components/KnowledgeJourney.tsx"), "utf-8");

test("EditorialCarousel is absent from the V19 results render tree", () => {
  // Scan for the import and the JSX element specifically — a prose mention
  // in a comment explaining the removal is fine; wiring it back in is not.
  assert.ok(!resultsPageSource.includes('from "@/components/EditorialCarousel"'), "results/page.tsx must not import EditorialCarousel");
  assert.ok(!resultsPageSource.includes("<EditorialCarousel"), "results/page.tsx must not render EditorialCarousel");
});

test("the editorial article does not render when unavailable (gated on data.editorialBrief)", () => {
  assert.ok(/\{data\.editorialBrief && \(/.test(resultsPageSource));
});

test("the timeline section is gated on real timeline data, not relatedList", () => {
  assert.ok(/\{data\.timeline && data\.timeline\.length > 0 && \(/.test(resultsPageSource));
  assert.ok(!/relatedList=\{/.test(resultsPageSource), "KnowledgeJourney must not receive relatedList");
});

test("the synthetic timeline fallback no longer exists in KnowledgeJourney", () => {
  // Scan for the generation code (template literals), not prose mentions
  // of the removed behavior in comments.
  assert.ok(!knowledgeJourneySource.includes("Timeline progression of ${"));
  assert.ok(!knowledgeJourneySource.includes("Phase ${"));
  assert.ok(knowledgeJourneySource.includes("if (parsedTimeline.length === 0) return null;"));
});

test("Did You Know hides when empty", () => {
  assert.ok(/\{data\.didYouKnow && data\.didYouKnow\.length > 0 && \(/.test(resultsPageSource));
});

test("hero image omission leaves no empty image container", () => {
  assert.ok(/\{data\.article\.thumbnail && \(/.test(resultsPageSource));
});

test("knowledge graph hides when empty", () => {
  assert.ok(/\{data\.knowledgeGraph && data\.knowledgeGraph\.length > 0 && \(/.test(resultsPageSource));
});

test("Continue Learning hides when empty", () => {
  assert.ok(/\{data\.exploredTopics && data\.exploredTopics\.length > 0 && \(/.test(resultsPageSource));
});

// ---------------------------------------------------------------------
console.log(`\n=======================================================`);
console.log(`Unit test results: ${passed} passed, ${failed} failed.`);
console.log(`=======================================================`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
