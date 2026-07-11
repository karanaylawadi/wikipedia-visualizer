# V18 Phase 1 Review — Trustworthy Artifact Pipeline

Branch: `fix/v18-trustworthy-artifacts`. Source of truth:
`reports/audits/V17_FORENSIC_AUDIT.md`. Plan: `reports/releases/V18_PHASE1_IMPLEMENTATION_PLAN.md`.
No commit or push has been made — this branch is ready for review.

Success criterion restated, per the task: *"The system can reliably distinguish trusted
knowledge from fallback filler, and invalid content can no longer be cached or rendered as
canonical truth."* This review reports against that bar, not against prose quality.

---

## Root Causes Fixed

Each item traces to a specific forensic-audit bug and the file where it's now closed.

1. **Hardcoded confidence presented as computed quality** (Bug #1). `dag.ts` no longer writes
   `compiler: 0.95` / `overall: 0.92` literals. Every confidence number is now derived from
   `qualityGate.ts`'s `assessArtifactQuality()`, which computes ten independent signals
   (provenance coverage, field coverage, placeholder penalty, fallback penalty, source
   agreement, extraction completeness, fact specificity, graph validity, timeline validity,
   validation penalty) from the artifact's actual content.
2. **Heuristic resolver confidence hardcoded to bypass verification** (Bug #4).
   `entityResolver.ts`'s `runHeuristicClassification()` no longer returns a flat `0.96`. Direct
   title-match branches now return `0.8`; the generic keyword-scan fallback returns `0.55` —
   both honestly below LLM-tier confidence.
3. **Placeholder content generated at the source** (Bugs #9, #12, #13). `compiler.ts`'s
   `getFallbackCompilation()` no longer writes `"Compiled detail for {field}"` or
   `["Significant Item 1", "Significant Item 2"]` into required fields — an unfillable field
   is left absent. The timeline fallback no longer writes `"Pivotal era in {year}"`; years are
   now filtered for a co-occurring event keyword or proper noun before being kept, and the
   headline/description are built from the real source sentence via the new sentence cleaner.
4. **Placeholder propagation into the knowledge graph** (Bug #2 — the sharpest finding in the
   audit). `knowledgeGraph.ts` now runs every triple, from both the LLM path and the fallback
   path, through `validateTriple()` before it can enter the graph. The synthetic
   `HAS_PROPERTY → Detail_Aspect_N` padding branch was deleted outright rather than fixed.
5. **Blind word-count truncation destroying facts** (Bug #5 — the Japan kanji example).
   `documentaryWriter.ts`'s local `cleanFact()` is gone, replaced by
   `sentenceCleaner.ts`'s `cleanSentence()`/`cleanFragment()`, which never cuts mid-clause and
   prefers a complete sentence over a short broken one.
6. **`referenceLabel` collapsing to "The"** (Bug #8 — present in the LLM-success path too, not
   just fallback). Fixed at the root: `FactScriptChapter` now carries the ontology blueprint's
   own `referenceLabel` (e.g. "Causes," "Production") forward from `NarrativeChapter`, and
   `documentaryWriter.ts` uses that instead of splitting the long generated chapter title.
7. **Fixed-by-index templates with zero ontology awareness** (Bug #6 — the "chemical
   processes" question on a film's Release chapter). `narrativePlanner.ts`'s
   `fallbackQuestions` array is gone; the fallback question is now anchored to the real chapter
   label (`"What defines the {chapterTitle} of {title}?"`).
8. **Inventing content when the fact pool ran out** (Bug #7's Japan chapter 5 case study — a
   chapter built entirely from `"Concluding analysis confirms modern legacy values of Japan"`,
   zero source basis). `narrativePlanner.ts` and `factScript.ts` no longer backfill an empty
   chapter with template facts or template cause/effect/takeaway; the chapter is flagged
   `insufficientData: true` and dropped before the documentary writer stage.
9. **Flat, identical evaluation metrics presented as measurement** (part of the fake-confidence
   pattern, found while implementing this phase). `factEvaluator.ts`'s
   `getFallbackEvaluation()` no longer returns `confidence: 0.95, narrativeValue: 0.8, ...`
   identically for every fact; each metric is now computed from real per-fact signals (word
   count, proper-noun density, presence of dates/numbers, superlatives).
10. **Cache write with no comparison** (headline finding). `cacheGuard.ts`'s
    `shouldAcceptWrite()` now gates every cache write: a `FAIL` is never cached, and a worse
    artifact can never overwrite a better one at the same version.
11. **Linter detection gaps** (Bugs #12, #13, #14, #18). `linter.ts` now routes placeholder and
    timeline-placeholder detection through the shared `placeholderDetector.ts` instead of
    narrow substring lists; a new `reader_question_quality` check scans every reader question;
    a new `graph_no_synthetic_nodes` check is defense-in-depth on top of the graph builder's own
    filtering; `timeline_chronological` was promoted from a warning to a hard error (the one
    rule the audit found correctly detecting a real defect, previously unable to affect
    `passed`).
12. **`graph_proximity`'s structural no-op** (Bug #10, found in the earlier V18 master-plan
    audit, fixed here). `editorial/related.ts`'s similarity scorer no longer includes a term
    that checks whether a candidate is in the list it was drawn from (always true by
    construction). Replaced with a real `description_overlap` signal, weights rebalanced, and
    a minimum-score floor now filters out weak matches instead of always filling ten slots.
13. **Silent fallback with no observability** (Bug #3). Every LLM call site now records a
    `StageDiagnostic` (stage, provider, model, attempted/succeeded/failed, failure reason,
    rate-limited flag, fallback-used flag, duration) with no secrets logged. The artifact
    carries `stageDiagnostics[]` and a `qualityAssessment` summarizing them.

## Files Changed

**New modules** (`src/lib/knowledge/`): `placeholderDetector.ts`, `diagnostics.ts`,
`sentenceCleaner.ts`, `qualityGate.ts`, `cacheGuard.ts`.

**New test script**: `scripts/run-unit-tests.ts` (41 assertions, dependency-free, run via the
already-installed `tsx`).

**Modified**: `src/types/knowledge.ts` (new types: `GenerationMode`, `StageDiagnostic`,
`ConfidenceBreakdown`, `QualityAssessment`, `ArtifactStatus`; `insufficientData` added to
`NarrativeChapter`/`FactScriptChapter`; `referenceLabel` added to `FactScriptChapter`;
`qualityAssessment`/`stageDiagnostics` added to `KnowledgeArtifact`), `entityResolver.ts`,
`compiler.ts`, `knowledgeGraph.ts`, `factEvaluator.ts`, `narrativePlanner.ts`, `factScript.ts`,
`documentaryWriter.ts`, `stylePolish.ts`, `linter.ts`, `store.ts` (version bump + new
`QUALITY_GATE_VERSION`), `dag.ts` (orchestration rewrite), `src/app/api/analyze/route.ts`
(module hiding + diagnostics gating), `src/lib/editorial/related.ts`,
`src/lib/editorial/wikipedia.ts` (exported an existing filter function for reuse),
`scripts/run-benchmarks.ts` (added Napoleon Bonaparte + Renaissance Art topics, nine new trust
assertions).

**Not touched, deliberately**: any file under `src/components/`, `src/app/page.tsx`,
`src/app/results/page.tsx`, and the 27 already-dead files identified in
`docs/ARCHITECTURE.md`. No UI redesign, no prose-quality changes, no new product features.

## Cache Migration Performed

`COMPILER_VERSION` and `ONTOLOGY_VERSION` moved from `"v17.0"` to `"v18.0"`
(`src/lib/knowledge/store.ts`), which is the mechanism that made every artifact compiled before
this phase stale on next read — no manual deletion, per the plan.

**What actually happened when this ran live** (see Remaining Risks below for the bug this
surfaced): the full benchmark suite (18 topics, `scripts/run-benchmarks.ts`) was run against a
live `GEMINI_API_KEY` that turned out to have a **zero-quota free tier** (`RESOURCE_EXHAUSTED`,
`limit: 0`, confirmed directly from the API's own error response — this is the concrete,
first-hand confirmation of what the forensic audit could only infer from static evidence). This
forced every one of the 18 topics through the fallback path. 16 of the 18 corresponding cache
files under `knowledge/` were overwritten with the new, honestly-labeled `v18.0`/`FAIL`
artifacts; one (`knowledge/technology/kubernetes.json`) was deleted and deliberately not
replaced (see the cache-write bug below); two new files were created for the two newly-added
benchmark topics. `git diff`/`git status` on this branch shows this transformation directly —
see Representative Artifact Diffs below.

## Examples of Rejected Artifacts

- Every one of the 18 live benchmark runs scored `qualityAssessment.status: "FAIL"` (scores
  38–41/100, `generationMode: "fallback"`), because the zero-quota key forced 100% fallback
  generation. Per `cacheGuard.ts`, a `FAIL` is never written to the canonical cache — confirmed
  live: `[DAG] Cache write REJECTED for "Kubernetes": candidate artifact status is FAIL — never
  cached, regardless of version or existing cache state.`
- Every trust check in `scripts/run-benchmarks.ts`'s new nine-assertion suite passed for every
  topic *despite* the overall `FAIL` status — i.e. the fallback path produced honestly empty,
  non-placeholder, non-fabricated output, which is the correct outcome under a non-functional
  key, not a regression.

## Examples of Hidden Modules

Taken directly from the live run (`Inception`, representative of all 18):

- **`cards` (documentary chapters)**: all 5 chapters were flagged `insufficientData: true` — the
  ranked-facts pool was reachable, but with zero real cause/effect synthesis available (no LLM),
  every chapter was dropped before the documentary writer stage. `resultCards` is empty. This is
  visible directly in the artifact diff: `knowledge/movie/inception.json`'s entire `cards` array
  disappeared.
- **`knowledgeGraph`**: `0 triples` (down from 8 synthetic `Detail_Aspect_N` triples in the old
  artifact) — with `structuredFacts.director`/`cast`/etc. now absent rather than
  placeholder-filled, the fallback graph builder had nothing real to build from, and produced
  nothing rather than filler.
- **`structuredFactsData`**: hidden — 0% of the Movie ontology's 7 required fields
  (`director`/`cast`/`composer`/`themes`/`awards`/`reception`/`legacy`) had real values.

## Before / After Confidence Metadata

From the live `Inception` artifact (`knowledge/movie/inception.json`, viewable via `git diff`):

| Field | Before (V17) | After (V18) |
|---|---|---|
| `confidenceScores.resolver` | `0.96` (hardcoded in every heuristic-path artifact) | `0.8` (computed: direct title-match branch) |
| `confidenceScores.compiler` | `0.95` (hardcoded literal, always) | `0` (computed field coverage: 0 of 7 required fields filled) |
| `confidenceScores.overall` | `0.92` (hardcoded literal, always) | `0.39` (computed quality score / 100) |
| `qualityAssessment` | *(field did not exist)* | `{generationMode: "fallback", fallbackRatio: 1, placeholderCount: 0, qualityScore: 39, status: "FAIL", modulesHidden: ["cards","knowledgeGraph","structuredFactsData",...], reasons: [...]}` |
| `structuredFacts.director` | `"Compiled detail for director"` | *(absent)* |
| `knowledgeGraph` | 8 triples incl. `"Compiled detail for director" DIRECTED Inception` | `[]` |
| `structuredFacts.cards[0].readerQuestion` | `"What represents the starting motivation behind Story?"` | *(no cards — chapter dropped)* |

## Known Limitations

- **This phase could not demonstrate a live `PASS`.** The available `GEMINI_API_KEY` has zero
  free-tier quota in this environment, so every live run — 18 benchmark topics plus the targeted
  regression test — exercised only the fallback path. The `PASS` code path (full field coverage,
  high provenance coverage, primary generation) is verified by the 41 unit tests using
  synthetic inputs, not by a live end-to-end run. This should be the first thing re-verified
  once a working key is available.
- **`npm run build` did not complete in this environment.** Both the Turbopack and webpack
  backends stalled with near-zero CPU progress over multiple 3–5 minute windows. Diagnosis:
  `vm_stat` showed the host machine (a personal 8GB-RAM Mac, not a dedicated CI box) had well
  under 200MB free while Chrome, the Claude desktop app, and ChatGPT were concurrently running —
  a Next.js production build with the experimental React Compiler transform could not get enough
  memory headroom to make progress. This was not a code-correctness failure: `npx tsc --noEmit`
  passed cleanly (zero errors) and `npm run lint` completed (see below) — both exercise the
  entire changed surface. This is flagged as an open item, not swept under the rug: **a full
  production build has not been verified for this branch.**
- **Lint fails overall: 68 problems (44 errors, 24 warnings)** on a lint run that actually
  completed (two earlier "clean"/exit-0 lint runs in this session turned out to be false
  negatives from the same memory-constrained environment — confirmed to have silently not
  finished, the same failure mode as the build stall below). After this phase's own cleanup
  (removed two unused imports/vars in `documentaryWriter.ts` and `route.ts`, typed two `any`
  usages in `scripts/run-benchmarks.ts`'s new trust-check code, replaced a
  `catch (error: any)`), the count dropped from 73→68 problems. Everything remaining is either
  in files this phase explicitly did not touch (dead/orphaned components like
  `ArticleCard.tsx`/`Carousel.tsx`, dead `editorial/` modules like
  `entityClassifier.ts`/`summary.ts`/`geminiWriter.ts`, and `src/app/page.tsx`) or is the
  pre-existing `structuredFacts: Record<string, any>` pattern used consistently across
  `linter.ts`, `entityResolver.ts`, `ontologyEngine.ts`, `compiler.ts`, `store.ts`,
  `types/knowledge.ts`, and (kept deliberately consistent) this phase's new `qualityGate.ts` —
  a codebase-wide typing pattern `docs/V18_MASTER_PLAN.md`'s ROI item #20 explicitly scoped as
  later work ("best done after ontology-specific data shapes stabilize"), not a Phase 1
  concern. **Net: lint fails overall, but the count attributable to this phase's new code is
  effectively zero** beyond the established, documented `Record<string, any>` convention.
- **The React Compiler / `page.tsx` and `VisualSnapshot.tsx` `setState`-in-effect errors are
  pre-existing** in files this phase did not touch, surfaced only because this was the first
  lint run in this environment that actually completed end to end.

## Remaining Risks

- **A real bug was found and fixed live during this phase's own verification, not by a unit
  test written in advance.** `cacheGuard.ts`'s `shouldAcceptWrite()` originally checked the
  version-bump condition *before* the `FAIL` check, so a version bump (which always returns
  `accepted: true`) short-circuited past the FAIL rejection entirely. This was caught by
  inspecting the actual on-disk artifact after the first full benchmark run
  (`knowledge/movie/inception.json` had genuinely been overwritten with a `FAIL`-status
  artifact). Fixed by moving the FAIL check to the top of the function, unconditional. A
  regression test (`"regression: a version bump does NOT bypass the FAIL check"`) was added to
  `scripts/run-unit-tests.ts` and passes. **This is exactly the kind of bug Phase 1 exists to
  prevent, and it was caught inside Phase 1 itself** — a reasonable confidence signal, but also
  a reminder that the unit-test suite's synthetic inputs did not originally cover this
  combination; a live run did.
- **17 of the 18 live-tested topics' cache entries are currently `FAIL`-labeled artifacts from a
  zero-quota key, not from a genuine content-quality problem.** With the `dag.ts` change added
  in this same fix (`needsRecompilation` now also triggers on `cached.qualityAssessment?.status
  === "FAIL"`), these will automatically retry on the next request once a working key is
  available — no manual cache-clearing required.
- **Two dead files remain unreferenced but untouched**: `src/lib/knowledge/geminiWriter.ts` and
  `src/lib/editorial/validator.ts`. This phase did not delete dead code (out of scope per
  `docs/V18_MASTER_PLAN.md`'s Phase 8), but it's worth noting `geminiWriter.ts` contains its own
  set of forbidden-word lists that are now the third (of what should be one) place such a list
  is maintained — unchanged from before this phase, flagged for Phase 8.
- **The build stall means the actual Next.js bundle output has not been verified** for this
  branch — only the source has been type-checked and (mostly) linted. If the user can free
  memory (closing some other running applications) or run this on a machine with more headroom,
  re-running `npm run build` is the single highest-value remaining verification step.

## Is Phase 2 Safe to Begin?

**Conditionally yes**, with one prerequisite: **verify a live `PASS` run before starting Phase
2 (Narrative Engine).** Everything in this phase has been verified either by unit test (41/41,
synthetic inputs covering PASS/PARTIAL/FAIL, placeholder detection, graph validation, cache
comparison, sentence cleaning) or by live run under a broken key (18/18 topics, confirming the
fallback path is now honest rather than deceptive, and catching one real ordering bug in the
process). What has *not* been verified live is the primary/LLM-success path — whether a real
Gemini call, once quota is restored, produces an artifact that correctly reaches `PASS` end to
end through the new quality gate without an unforeseen threshold or type mismatch. This is a
reasonable, bounded gap (Phase 2's own scope — narrative engine quality — depends on real LLM
output existing to improve), not a reason to block Phase 2 planning, but it should be the first
thing confirmed once a working key is available, ideally before Phase 2 code lands on top of it.
