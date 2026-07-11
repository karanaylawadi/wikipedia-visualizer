# V18 Phase 1 Implementation Plan — Trustworthy Artifact Pipeline

Source of truth: `reports/audits/V17_FORENSIC_AUDIT.md`. Governing law:
`docs/NON_NEGOTIABLES.md` (after `CLAUDE.md`). This plan implements Phase 1 of
`docs/V18_MASTER_PLAN.md` — "Knowledge Quality" — scoped exactly to the twelve numbered
requirements in this task, nothing more. No UI redesign, no prose-quality work, no new
features. Branch: `fix/v18-trustworthy-artifacts`.

## Guiding principle for every decision below

Per the task: *"insufficient data → hide module. invalid fallback → do not render. Never
fill space for visual completeness."* Every change is judged against one question: **does
this make it possible for weak/placeholder/unverifiable data to be presented as validated
canonical knowledge?** If yes, it must be closed off, even if that means a module renders
empty (hidden) for a topic that previously showed generic filler.

---

## New Modules (created, not modifying existing files)

| File | Responsibility |
|---|---|
| `src/lib/knowledge/placeholderDetector.ts` | Single source of truth for placeholder/generic-phrase detection. Exports `isPlaceholderValue(text)`, `containsPlaceholder(text)`, and the canonical phrase list (supersedes the three independently-hand-maintained lists found in the forensic audit: `linter.ts`'s `BANNED_AI_WORDS_PHRASES`, and the two prompt-embedded forbidden lists in `documentaryWriter.ts`/`stylePolish.ts` remain as LLM *prompt* guidance — a different purpose — but the ingestion-time *rejection* logic all routes through this one module). |
| `src/lib/knowledge/diagnostics.ts` | `StageDiagnostic` type and a `recordStage()` helper. Every LLM call site pushes one diagnostic entry into a `diagnostics: StageDiagnostic[]` array threaded through `dag.ts`. No secrets logged (no API key, no raw request/response bodies — only stage name, provider, model, attempted/succeeded/failed booleans, a short failure-reason string, rate-limited flag, parsed-successfully flag, fallback-used flag, duration). |
| `src/lib/knowledge/qualityGate.ts` | Computes `ConfidenceBreakdown` and `QualityAssessment` from real inputs (diagnostics, placeholder counts, provenance coverage, ontology field coverage, graph validity, timeline validity, lint results). Produces the `PASS`/`PARTIAL`/`FAIL` verdict and the per-module pass/hide decision list. This is the only place a confidence or quality number is computed — no other file may hardcode one. |
| `src/lib/knowledge/sentenceCleaner.ts` | Replaces `documentaryWriter.ts`'s `cleanFact()`. Sentence-boundary-aware compression: never cuts mid-clause, preserves trailing named entities/dates/numbers/quoted terms, degrades to "use the full sentence" rather than mutilate it if it cannot compress safely. |
| `src/lib/knowledge/cacheGuard.ts` | `compareArtifactQuality()` and `shouldAcceptWrite()` — cache write protection. Never overwrites a cached artifact with a strictly worse one (by quality score, provenance coverage, fallback ratio, placeholder count) unless the compiler/schema/quality-gate version advanced. Attaches a `cacheDecision` audit trail to the write. |
| `scripts/run-unit-tests.ts` | Plain assertion-based unit tests (Node's `assert/strict`, run via the already-installed `tsx` — no new dependency), covering confidence calculation, placeholder detection, graph-node validation, cache-write comparison, sentence-aware cleaning, and PASS/PARTIAL/FAIL classification. Mirrors the existing style of `scripts/run-benchmarks.ts`. |

## Modified Files and Functions

| File | Function(s) | Change |
|---|---|---|
| `src/types/knowledge.ts` | (type additions) | Add `GenerationMode`, `StageDiagnostic`, `ConfidenceBreakdown`, `QualityAssessment` types. Add `qualityAssessment: QualityAssessment` and `stageDiagnostics: StageDiagnostic[]` to `KnowledgeArtifact`. Keep `confidenceScores` (existing consumers) but its four numbers must now be *derived from* `qualityAssessment`, never hardcoded at the call site. |
| `src/lib/knowledge/entityResolver.ts` | `runHeuristicClassification()` | Remove the hardcoded `confidence: 0.96`. Compute confidence from match specificity: a direct hardcoded title-match branch (e.g. `t.includes("einstein")`) → `0.8`; the generic keyword-scan branch → `0.55`. Document why in a comment (heuristic classification is inherently less reliable than LLM classification and must never report LLM-tier confidence). |
| `src/lib/knowledge/compiler.ts` | `compileKnowledge()`, `getFallbackCompilation()` | Fallback no longer writes `"Compiled detail for {field}"` into required fields — an unfillable field is left absent (`undefined`), not filled with prose that looks like data. Timeline fallback drops the "any 4-digit number" extraction in favor of years that co-occur with a capitalized proper noun or event-keyword within the same sentence (a cheap, real significance filter — not LLM-quality, but no longer indiscriminate). Every output is tagged with `generationMode: "fallback"` at the field level via a returned `fallbackFields: string[]` list. |
| `src/lib/knowledge/knowledgeGraph.ts` | `buildKnowledgeGraph()`, `getFallbackGraph()` | New `validateTriple()` gate (in this file, using `placeholderDetector`) rejects a triple if subject/object is a placeholder value, empty, a duplicate of an existing triple, a self-relation, or (for the synthetic padding branch) uses `HAS_PROPERTY`/`Detail_Aspect_N` at all — that padding branch is deleted outright rather than fixed, since it never carried information (forensic audit Bug #2/#15). A graph with fewer than the linter's minimum after filtering is honestly short, not padded. |
| `src/lib/knowledge/factEvaluator.ts` | `getFallbackEvaluation()` | Remove the flat hardcoded metric constants (`confidence: 0.95, narrativeValue: 0.8, ...` identical for every fact). Metrics are computed from real per-fact signals (length, presence of a date/number, presence of a quoted phrase) — still heuristic, but no two different facts get identical numbers unless they genuinely score the same on every input signal. |
| `src/lib/knowledge/narrativePlanner.ts` | `getFallbackPlan()` | Remove the fixed-by-index `fallbackQuestions`/`fallbackFacts` template arrays (source of the "chemical processes" question and the fact-free Japan chapter 5). If `rankedFacts.slice(start,end)` is empty for a chapter, that chapter is marked `insufficientData: true` instead of being backfilled with an invented fact — `dag.ts`/`qualityGate.ts` will hide that chapter rather than render it. `readerQuestion` fallback becomes a plain, honest template anchored to the *ontology's real `referenceLabel`* (e.g. `"What defines the {referenceLabel} of {title}?"`) rather than a fixed 5-question array indexed by position — still generic, but no longer nonsensical or ontology-mismatched, and it is only ever used as scaffolding for a chapter that will otherwise be hidden if its facts are also insufficient. |
| `src/lib/knowledge/factScript.ts` | `getFallbackChapterScript()` | `cause`/`effect`/`takeaway` template strings removed. When no LLM output is available, these fields are left empty and the chapter is flagged `insufficientData: true` (same mechanism as above) rather than synthesizing connective tissue with zero source basis. |
| `src/lib/knowledge/documentaryWriter.ts` | `writeDocumentarySummary()`, `writeDocumentaryCard()`, `getFallbackSummary()`, `getFallbackCard()`, `parseProvenanceAndClean()` | Replace `cleanFact()` calls with `sentenceCleaner.ts`'s `cleanSentence()`. Fix `referenceLabel` (both call sites, per forensic audit Bug #8 — present in the LLM-success path too) to use the chapter plan's own `referenceLabel` field instead of `chapterTitle.split(" ")[0]`. Fallback summary/card generation is retained only as a degraded-but-honest mode (real, untruncated sentences built from real facts) — if a chapter has `insufficientData: true` from Stage 8, its card is not generated at all; the chapter is dropped from `structuredFacts.cards` and the DAG records why. |
| `src/lib/knowledge/stylePolish.ts` | `polishDocumentary()` | No functional change to its LLM prompt; add a diagnostic record so a silently-failed polish pass (found in all three forensically-traced topics) is now visible instead of invisible. |
| `src/lib/knowledge/linter.ts` | `lintArtifact()`, `no_placeholder_wording`, `no_timeline_milestone_placeholder`, `graph_connected`, new `readerQuestion` check, new `chapter_completeness` check | Route placeholder/timeline-placeholder detection through `placeholderDetector.ts` instead of the narrow substring lists. Add a check scanning `readerQuestion` against the banned-phrase list. Add a `graph_no_synthetic_nodes` check (now structurally guaranteed by the Knowledge Graph change above, but verified here too, defense-in-depth). Promote `timeline_chronological` from `warnings` to `errors` (forensic audit Bug #18 — it is the one rule proven to correctly catch a real defect; it must be able to block `passed`). Confidence checks (`resolver_confidence_ok`, `compiler_confidence_ok`, `overall_confidence_ok`) now read from the computed `qualityAssessment`, not the old hardcoded `confidenceScores` values. |
| `src/lib/knowledge/store.ts` | (constants) | Bump `COMPILER_VERSION` and `ONTOLOGY_VERSION` to `"v18.0"` — this is the mechanism that forces every existing cached artifact to be treated as stale (see Cache Migration below). Add `QUALITY_GATE_VERSION = "v1.0"` as a fourth version dimension so a future quality-gate-only change can invalidate the cache without also bumping the compiler version. |
| `src/lib/knowledge/dag.ts` | `processKnowledgeDAG()` | Thread a `diagnostics: StageDiagnostic[]` array through every stage call. After compiling, call `qualityGate.assess()` to produce `QualityAssessment`. Branch on `status`: `FAIL` → do not call `saveLocalArtifact()`, return the artifact with `validationStatus.passed=false` and an empty/hidden module set; `PARTIAL` → cache is allowed only via `cacheGuard`'s comparison (see below), and only individually-passing modules are marked renderable; `PASS` → cache normally. Replace the hardcoded `confidenceScores: {compiler: 0.95, overall: 0.92, ...}` literal with `qualityAssessment`-derived values. Route the cache write through `cacheGuard.shouldAcceptWrite()` instead of the bare `if (needsRecompilation && lintReport.passed)` check. |
| `src/app/api/analyze/route.ts` | `POST()` | Read `artifact.qualityAssessment.status` and `modulesHidden`. Omit (set to `null`/`[]`/`undefined`, not filler) any response field whose backing module is hidden — `resultCards`, `didYouKnow`, `timeline`, `structuredFacts.*Data`, `exploredTopics` are each individually gated. This requires **no frontend change**: every consuming component already has a `data.X && data.X.length > 0` guard (`FactCards`, `KnowledgeJourney`, `DiscoveryCarousel` in `results/page.tsx`) — hiding a module is achieved by the API honestly not sending data for it, not by adding new UI logic. `stageDiagnostics` and the full `qualityAssessment` breakdown are attached to the response only when `process.env.NODE_ENV !== "production"` or an explicit `DEBUG_QUALITY=1` env flag is set — production responses get a minimal `qualityStatus: "PASS"|"PARTIAL"|"FAIL"` field only, per requirement 8's "safe status metadata only when explicitly enabled." |
| `scripts/run-benchmarks.ts` | `BENCHMARK_TOPICS`, `runBenchmarks()` | Add Renaissance (for "Renaissance Art"), Napoleon Bonaparte (currently absent from the suite entirely — a coverage gap the forensic audit and `docs/GOLDEN_OUTPUTS.md` both flagged). Add the nine new assertions listed in requirement 9 (no placeholder strings, confidence not hardcoded, fallback artifacts cannot report PASS, provenance coverage threshold, no placeholder graph nodes, no incomplete truncated facts, timelines contain named source-supported events, failed modules omitted rather than filled, cached artifact slug/metadata correct). |

## Migration and Cache-Invalidation Strategy

1. **Version bump is the invalidation mechanism**, per the existing dependency-hash design in
   `store.ts`/`dag.ts` (`docs/DECISIONS.md`'s V15 decision — this plan does not replace that
   design, it uses it correctly for the first time). `COMPILER_VERSION` and `ONTOLOGY_VERSION`
   move from `"v17.0"` to `"v18.0"`. Every existing cached artifact's `compilerVersion` field
   reads `"v17.0"`, so `needsRecompilation` in `dag.ts` will evaluate `true` for all of them on
   next read — no manual deletion required, and nothing is deleted blindly.
2. **The 16 existing poisoned artifacts under `knowledge/` are left on disk, untouched, as a
   historical/forensic record** (they are exactly what `reports/audits/V17_FORENSIC_AUDIT.md`
   quotes from) — they simply stop being served, because `loadLocalArtifact()` will find a
   version mismatch on the next request for that topic and recompile. This is the "document
   the migration, don't delete blindly" requirement satisfied: the migration *is* the version
   bump, and the old files remain as an audit trail unless a human explicitly cleans them up
   later.
3. **New quality-gate version dimension.** `QUALITY_GATE_VERSION` is added to the dependency
   hash calculation so that a future change to `qualityGate.ts`'s scoring alone (without a
   compiler/ontology change) can also force recompilation.
4. **Regenerating the cache is out of scope for this phase.** This plan does not require a
   live `GEMINI_API_KEY` call to succeed — Phase 1's job is to make the *gate* trustworthy, not
   to guarantee LLM calls succeed. `scripts/run-benchmarks.ts` will report whichever topics
   currently produce `PASS`/`PARTIAL`/`FAIL` with the new gate; if the key is still not working
   end-to-end, benchmark topics will legitimately report `FAIL` or `PARTIAL` rather than a
   false `PASS` — **that is the intended, correct outcome of this phase**, not a bug to hide.

## Regression Risks

- **Every current benchmark topic may newly report `FAIL` or `PARTIAL`** instead of `PASS`,
  because the artifacts on disk today are 100% fallback-authored (forensic audit headline
  finding) and this phase is explicitly designed to stop fallback content from reporting
  `PASS`. This is an expected, correct behavior change, not a regression — but it means
  `scripts/run-benchmarks.ts`'s exit code may go from 0 to 1 depending on whether
  `GEMINI_API_KEY` actually works in this environment. This will be reported plainly in
  `reports/benchmarks/V18_PHASE1_RESULTS.md`, not hidden.
- **`route.ts` response shape change**: fields that always used to be present (even if
  low-quality) may now be `null`/`[]` for a `FAIL`/`PARTIAL` topic. Any code assuming these
  fields are always populated could break. Mitigated by keeping the field *types* unchanged
  (still arrays/nulls the frontend already guards against) — only the *population* changes.
- **Removing the `Detail_Aspect_N` padding branch in `getFallbackGraph()`** means some topics'
  `knowledgeGraph` array may now be shorter than the linter's `graph_has_triples` minimum
  (`>= 5`). This is intentional (an honest short graph beats a padded fake one) but changes
  which topics pass that specific rule — the rule's *meaning* changes from "at least 5 triples
  exist" to "at least 5 *real* triples exist," which is stricter by design.
- **Removing hardcoded `readerQuestion`/`cause`/`effect`/`takeaway` templates** means fallback
  chapters may now be dropped entirely (Stage 7/8 `insufficientData` path) rather than always
  rendering 5 chapters. A topic's `resultCards` array may legitimately have fewer than 5 items,
  or in the worst case (all chapters insufficient), zero — in which case `EditorialCarousel`
  already returns `null` when `cards.length === 0` (`EditorialCarousel.tsx:62`), so this is
  safe without a frontend change.
- **Bumping `COMPILER_VERSION`** is irreversible without another version bump — there is no
  "undo" that keeps old artifacts servable. This is accepted as correct per the task's
  explicit instruction to invalidate poisoned artifacts.
- **New `scripts/run-unit-tests.ts` has no prior art in this repo** (no test framework
  installed) — risk of inconsistent conventions with any test framework a future engineer
  might add. Mitigated by keeping it dependency-free and structurally identical to the
  existing `scripts/run-benchmarks.ts` pattern, so it's at minimum internally consistent.

## Tests to Add

- `scripts/run-unit-tests.ts` (new), covering, per requirement 9:
  - Confidence calculation (`qualityGate.ts`): a fallback-only artifact must score low; a
    fully-primary artifact with full provenance must score high; partial mixes must land
    between the two, monotonically with fallback ratio.
  - Placeholder detection (`placeholderDetector.ts`): every phrase named in requirement 3,
    plus the two forensically-discovered phrases not in that list (`"Compiled detail for"`
    variants, `"Significant Item"`), must be detected in both exact and light-paraphrase form.
  - Graph-node validation (`knowledgeGraph.ts`'s `validateTriple()`): a placeholder-subject
    triple, a self-relation triple, a duplicate triple, and an empty-label triple must all be
    rejected; a valid triple must be accepted.
  - Cache-write comparison (`cacheGuard.ts`): a worse artifact must never overwrite a better
    cached one at the same compiler version; a version bump must always be accepted
    regardless of relative quality.
  - Sentence-aware fact cleaning (`sentenceCleaner.ts`): the exact Japan kanji example from
    the forensic audit (must not cut before "日本"), plus at least two more named-entity/date
    endings, must survive intact or be safely dropped to the prior full clause — never cut
    mid-clause.
  - PASS/PARTIAL/FAIL classification (`qualityGate.ts`): boundary cases at each threshold.
- `scripts/run-benchmarks.ts` (modified), per requirement 9's per-topic assertion list, run
  against Space Race, Inception, Japan, Renaissance (Art), Napoleon Bonaparte, Photosynthesis
  plus the existing 16.

## Expected User-Visible Change

- For any topic whose compilation is fallback-heavy: **fewer or zero chapters, an empty or
  absent timeline, an empty or absent knowledge-graph-derived module, fewer or zero related
  topics, fewer or zero Did-You-Know cards** — modules are hidden, not filled. This is a
  visible *reduction* in on-page content for such topics, by design.
- For any topic whose compilation is primary (LLM)-driven and clean: **no visible change** —
  the same content renders, because it was never relying on fallback paths.
- No visual/layout change to any component. No new UI element is introduced to show quality
  scores, diagnostics, or confidence to end users (per requirement 8, that data is
  developer-facing only, gated behind an env flag).
- Chapter progress-tracker labels stop collapsing to repeated `"The"` (Bug #8 fix, unrelated
  to fallback vs. primary — this improves the UI's existing behavior, not its design).

## Conditions Under Which Modules Will Be Hidden

Decided in `qualityGate.ts`, applied in `route.ts`:

| Module | Hidden when |
|---|---|
| `resultCards` (documentary chapters) | A chapter has `insufficientData: true` (empty approved-facts pool) → that individual chapter is dropped. If **all** chapters are insufficient, `resultCards` is empty and `EditorialCarousel` renders nothing (existing `cards.length === 0` guard). |
| `timeline` | Fewer than 3 valid (non-placeholder-headline, real-event) entries survive filtering — per the existing `CLAUDE.md` rule ("Do not display a timeline with fewer than 3 valid events"), now actually enforced against filtered content instead of raw fallback output. |
| `didYouKnow` | Zero trivia candidates have a non-generic-definition fact and a genuine (non-empty, on-topic-checked) `readMoreTopic`. |
| `exploredTopics` (related topics) | Zero related topics pass the existing similarity scoring above a minimum threshold once the `graph_proximity` no-op term (forensic audit Bug #10) is corrected — this fixes the scoring bug and applies it as a real filter for the first time. |
| `structuredFacts.*Data` (VisualSnapshot ontology block) | Fewer than half of the ontology's `requiredFields` have non-placeholder values → the whole ontology-specific data block is omitted; `VisualSnapshot` already handles a missing/undefined block gracefully via its existing optional-chaining fallbacks to `facts.locations`/`facts.categories` etc., so no frontend change is required. |
| Knowledge graph (internal; not currently rendered) | Fewer than the linter's real (post-filter) minimum triples exist → `knowledgeGraph` array is empty rather than padded; has no visible effect today since no live component renders it. |
| Whole artifact (`FAIL` status) | Entity resolution confidence is very low AND required-field coverage is near zero AND provenance coverage is near zero — i.e., nothing usable was produced at all. In this case the API returns the raw Wikipedia `article` fields only (title/extract/thumbnail/url — never fabricated) with all generated modules absent, so the page still shows *something real* (the source article) rather than an error page, without ever presenting generated content as validated. |

## Ambiguities Resolved Without Waiting

Two judgment calls were needed that the repository/audit don't pin down exactly; both are
resolved conservatively (favoring "hide over fill," per the explicit instruction) rather than
escalated, since neither blocks correct implementation and both are documented here for
review:

1. **Exact numeric thresholds** (e.g. "provenance coverage meets threshold," "confidence
   above threshold" for graph nodes) are not specified anywhere in `CLAUDE.md`,
   `NON_NEGOTIABLES.md`, or the audit. Resolved as: provenance coverage threshold for a
   module to render = 100% of its rendered sentences must have a valid, non-empty provenance
   entry (this is what `sentence_provenance_ok` already nominally checks — Phase 1 makes it
   real rather than tautological, per Bug #20); ontology field-coverage threshold for the
   `*Data` block = at least 50% of required fields present and non-placeholder (a defensible,
   documented middle ground — not so strict that a mostly-good LLM compilation gets hidden
   over one missing optional-feeling field, not so loose that a mostly-placeholder block
   renders).
2. **Whether to delete the 16 poisoned cache files.** Resolved as: no, per the explicit "do
   not delete blindly without documenting migration" instruction — the version bump makes
   them inert without deletion, and they remain useful as the forensic audit's primary source
   evidence.

No other ambiguity required pausing implementation. Proceeding now.
