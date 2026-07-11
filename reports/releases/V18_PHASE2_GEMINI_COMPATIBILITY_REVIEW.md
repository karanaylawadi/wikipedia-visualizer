# V18 Phase 2 Review — Gemini Model Compatibility & Diagnostics Migration

Branch: `fix/v18-trustworthy-artifacts` (same branch as Phase 1). Source of truth:
`reports/audits/GEMINI_MODEL_COMPATIBILITY_AUDIT.md`. Prerequisite: `reports/releases/V18_PHASE1_REVIEW.md`.

Phase 1 built the trust architecture (quality gate, cache guard, placeholder detection,
diagnostics) but could not demonstrate a live `PASS`, because the available `GEMINI_API_KEY` had
zero quota. By the time this phase started, the *configured model itself* (`gemini-2.0-flash`)
had also been deprecated server-side (`404 — no longer available to new users`), so Phase 1's
open item ("verify a live PASS once a working key is available") could not even be attempted
until the model reference was fixed. This phase's scope, per explicit instruction, was narrow:
**Gemini model configuration, diagnostics, tests, and documentation only** — no changes to trust
thresholds, cache quality rules, narrative prompts, frontend design, timeline behaviour, trivia
ranking, or related-topic ranking.

## Root Causes Found and Fixed

Three distinct, independently-verified root causes were found live, in sequence — each one was
masking the next until fixed. See `reports/audits/GEMINI_MODEL_COMPATIBILITY_AUDIT.md` for the
full live-probe evidence (probe scripts were throwaway, deleted after use in every case).

1. **Deprecated pinned model (`gemini-2.0-flash` → `404`).** Confirmed live: `models.list()`
   still reports the model as valid with `generateContent` support, but the real
   `generateContent` call 404s with "no longer available to new users." Only `"-latest"` alias
   models (`gemini-flash-latest`, `gemini-flash-lite-latest`) succeed against this key. Fixed by
   centralizing model selection in the new `src/lib/ai/geminiConfig.ts`: `selectModel()`
   validates via `models.list()` first (cheap, the spec's primary mechanism), and
   `callGeminiModel()` additionally treats a live 404/"unavailable" response as an equally valid
   unavailability signal and retries once against the fallback model — because the audit proved
   list-based validation alone is not sufficient.
2. **Extended thinking silently consuming the entire output budget.** `gemini-flash-latest`
   defaults to extended thinking. A 500-token call returned `thoughtsTokenCount: 480`, leaving 16
   tokens for the actual JSON and truncating every response. This is why the *first* benchmark
   run after the model switch still showed 0/18 passing with 16 JSON-parse failures — the calls
   were succeeding (no thrown error) but the responses were unusable. Fixed by defaulting
   `thinkingConfig.thinkingBudget: 0` in `callGeminiModel()` (a caller-supplied `thinkingConfig`
   still overrides).
3. **Two stages' `maxOutputTokens` were too small for their own schema**, independent of
   thinking. `factEvaluator.ts` (2000, evaluating up to 15 facts × 7 metrics + reasoning) and
   `compiler.ts` (2500, the largest schema in the pipeline) still hit `MAX_TOKENS` after thinking
   was disabled. Bumped to 4000 and 6000 respectively, each verified live against a
   representative prompt before editing production code.

## StageDiagnostic Migration

`StageDiagnostic` (`src/types/knowledge.ts`) was redefined to carry model-selection detail
instead of a flat model-name string: `configuredModel`, `selectedModel`,
`modelValidationAttempted`, `modelValidationSucceeded`, `supportedGenerationMethod`,
`requestAttempted`, `requestSucceeded`, `failureReason`, `errorCategory`
(`invalid_model | unavailable_model | quota_exhausted | authentication_failure |
malformed_response | parser_failure | safety_rejection | network_failure | unknown`),
`quotaError`, `deprecatedOrUnavailableModel`, `fallbackModelUsed`, `fallbackContentUsed`,
`durationMs`. The old flat fields (`model`, `attempted`, `succeeded`, `failed`, `rateLimited`,
`parsedSuccessfully`, `fallbackUsed`) are gone entirely — this was a breaking change, not an
additive one, per explicit instruction not to weaken the interface or keep legacy fields around.

All 9 live call sites were migrated to the shared `recordGeminiSuccess()` /
`recordGeminiFailure()` / `recordFallback()` helpers in `diagnostics.ts`, replacing each file's
own hand-built diagnostic object: `entityResolver.ts` (2 call sites), `compiler.ts`,
`knowledgeGraph.ts`, `factEvaluator.ts`, `narrativePlanner.ts`, `factScript.ts` (per-chapter
loop), `documentaryWriter.ts` (2 call sites), `stylePolish.ts` (2 call sites, one shared
diagnostic per invocation since both calls represent one logical polish pass). `diagnostics.ts`
itself was simplified: the dead `runStage()` helper and the module-level `MODEL_NAME` constant
were removed, since model selection now lives entirely in `geminiConfig.ts`.

`scripts/run-unit-tests.ts`'s three mock `StageDiagnostic` fixtures (used by `qualityGate.ts`'s
fallback-ratio tests) were updated to the new shape; test intent (which diagnostics represent a
successful primary call vs. a fallback) is unchanged.

## Files Changed

**New**: `src/lib/ai/geminiConfig.ts` (model selection, validation, `callGeminiModel()`,
error classification, 5-minute in-memory selection cache).

**Modified**: `src/types/knowledge.ts` (`StageDiagnostic` redefined), `diagnostics.ts`
(simplified), `entityResolver.ts`, `compiler.ts`, `knowledgeGraph.ts`, `factEvaluator.ts`,
`narrativePlanner.ts`, `factScript.ts`, `documentaryWriter.ts`, `stylePolish.ts` (all 9 call
sites migrated to `callGeminiModel()` + the shared diagnostic recorders),
`scripts/run-unit-tests.ts` (3 mock fixtures updated).

**Not touched**: any narrative prompt text, any linter rule or threshold, `qualityGate.ts`,
`cacheGuard.ts`, `placeholderDetector.ts`, `sentenceCleaner.ts`, any UI component — consistent
with this phase's explicit scope boundary.

## Effect, Measured Across Three Successive Live Benchmark Runs

| Run | Gemini call/JSON-parse failures | `generationMode` mix | Quality scores | Benchmark PASS |
|---|---|---|---|---|
| Before this phase (model `404`) | 100% of calls (every call thrown) | 18/18 `fallback` | ~42/100, all `FAIL` | 0/18 |
| After fix #1 only (model switched, thinking still on) | 16 of ~18×9 call sites (truncated JSON) | mostly `fallback`/`mixed` | 79–99/100, mostly `PARTIAL` | 0/18 |
| After fixes #2 and #3 (this phase, final state) | **0** | 10/18 `primary`, 8/18 `mixed` | 91–98/100, all `PARTIAL` | 0/18 |

The model-compatibility objective — restore working Gemini calls, with correct, observable
diagnostics, without weakening any trust gate — is met: zero call/parse failures remain, and the
overwhelming majority of generation is now primary (LLM), not fallback.

**Benchmark PASS remains 0/18.** This is not a model-compatibility defect. Every remaining
failure is the linter (`linter.ts`) rejecting content-quality issues that are independent of
which model produced the text: sentence-provenance tagging coverage below the required
threshold, repeated 4-word phrases across chapters, paragraphs exceeding the length limit,
timeline chronological ordering, and a few missing ontology fields. See
`reports/releases/V18_EDITORIAL_QUALITY_BACKLOG.md` for the full per-topic, per-rule breakdown
and recommended next-phase fixes. Closing that gap requires changes to narrative prompts and/or
linter thresholds — both explicitly out of scope for this phase.

## Required Checks

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — succeeds (Turbopack, ~59s compile + ~75s typecheck + static generation).
- `npm run lint` — 68 pre-existing problems (44 errors, 24 warnings), identical count to the
  Phase 1 baseline; none in any file this phase touched.
- `npx tsx scripts/run-unit-tests.ts` — 41/41 pass, unchanged from Phase 1.
- `npx tsx scripts/run-benchmarks.ts` — 0/18 PASS (see above); 0 Gemini call/parse failures
  (down from 16 at the start of this phase's live verification).

## Known Limitations / Follow-Up

- **Benchmark PASS gap is scoped as a separate phase** (`V18_EDITORIAL_QUALITY_BACKLOG.md`,
  proposed as V18.1). Fixing it means editing narrative prompts and/or linter thresholds, which
  this phase's instructions explicitly forbade.
- **One ontology-classification disagreement, not content quality**: the topic "Renaissance"
  (ambiguous between "the historical period" and "the art movement") resolved to `Historical
  Event`, while the benchmark's own topic list expects `Art Movement` for it — while a separate
  topic, "Renaissance Art", correctly resolves to `Art Movement`. This is a benchmark-expectation
  / entity-resolution nuance, not a regression from this phase's changes, and is out of scope
  here; flagged in the backlog doc for a resolver-logic decision.
- **Cache-path instability observed as a consequence of the above, not fixed in this phase.**
  Because `store.ts` derives a cache file's path from the resolved ontology category and slug,
  and resolution is not perfectly stable run-to-run for ambiguous topics, repeated live runs
  during this phase's verification produced duplicate, divergently-scored cache files for the
  same real-world topic instead of one file converging toward the best result:
  `knowledge/historical_event/renaissance.json` (new, `PARTIAL`/96, this phase) sits alongside
  the original tracked `knowledge/art_movement/renaissance.json` (stale, `FAIL`/39, pre-dates this
  phase's fixes — never compared against, since `cacheGuard.ts` only compares candidates against
  whatever already exists at the *same* derived path). The same happened for "Interstellar" →
  `knowledge/movie/interstellar-film.json` (new, `PARTIAL`/94) alongside the stale, tracked
  `knowledge/movie/interstellar.json` (`FAIL`/40). Both duplicate files were **excluded from this
  phase's commit** rather than checked in as if canonical — this is a real finding for a future
  phase (likely: stabilize slug/ontology derivation before cache-path assignment, or key the
  cache by original input topic rather than resolved category), not something to paper over by
  committing whichever file happened to look best.
- **`thinkingBudget: 0` is a blanket default for every call site.** If a future stage genuinely
  benefits from extended reasoning (e.g., a more complex synthesis task), it can override via its
  own `config.thinkingConfig`, per `callGeminiModel()`'s caller-wins merge order. None of the
  current 9 call sites need it — they all want a direct structured answer.
