# V18 Master Plan

This is the single source of truth for the V18 development cycle. It supersedes nothing in
`docs/` — it synthesizes and ranks everything already documented in
[`ARCHITECTURE.md`](ARCHITECTURE.md), [`DECISIONS.md`](DECISIONS.md),
[`BENCHMARKS.md`](BENCHMARKS.md), and [`GOLDEN_OUTPUTS.md`](GOLDEN_OUTPUTS.md) into a single
prioritized plan. No code was changed to produce this document.

---

# Executive Summary

V17 shipped a genuinely better UI — a cohesive documentary-carousel design, keyboard
navigation, mobile-adapted layouts, real SEO metadata — over a knowledge pipeline whose
output quality did not improve to match it. The pages still read as generic because **the
system that is supposed to catch generic output cannot detect the specific kind of generic
output the system itself produces.**

This is not an LLM quality problem. It is an application-code problem, provable without
calling any model: all 16 committed artifacts under `knowledge/` were built by this
codebase's own deterministic fallback templates, and every one of them reports
`validationStatus.passed: true`.

## Root Architectural Causes, Ranked by Severity

1. **[Critical] The cache has no quality gate, only a version gate.** `dag.ts`'s
   `needsRecompilation` check compares compiler version, ontology version, and a dependency
   hash of the source text — never re-evaluates whether cached content is actually good. Once
   an artifact is written under the current `COMPILER_VERSION` (`v17.0`), it is served
   forever, regardless of quality.
2. **[Critical] The linter checks patterns, not meaning.** `lintArtifact()`'s ~27 rules are
   substring/regex matches against a fixed list of known-bad phrases. Every fallback template
   in the codebase avoids those exact phrases while remaining exactly the kind of generic
   output the rules exist to prevent. This is why `passed: true` and "reads as generic" are
   currently compatible outcomes.
3. **[Critical] Every pipeline stage silently substitutes deterministic filler on failure,
   with no visible signal.** Nine separate `getFallback*()` functions across
   `src/lib/knowledge/*.ts` produce plausible-looking JSON on any Gemini failure — rate limit,
   malformed response, missing key — and nothing logs this distinctly from a successful call.
   A key can be present and still produce 100% fallback output, undetected.
4. **[High] The artifact schema has no generation-provenance field.** `KnowledgeArtifact`
   records fact-to-sentence provenance (which fact supports which sentence) but not
   generation-path provenance (which fields came from the LLM vs. a fallback template). There
   is no way to query "how much of this artifact is real" without manual inspection.
5. **[High] Relatedness is unscored on the fallback path.** `relatedTopics` and
   `readMoreTopic` are positional slices of the raw Wikipedia link list with no relevance
   filter, even though a real scoring implementation (`getRelatedArticles()` in
   `editorial/wikipedia.ts`) already exists in the codebase — it simply has no caller.
6. **[Medium] Two full generations of superseded architecture remain in the tree** (13
   `lib/editorial/*` files, `geminiWriter.ts`, 14 `src/components/*` files — ~27 files, zero
   references). This doesn't cause bad output directly, but it triples the surface a future
   change has to rule out, and increases the odds of someone editing the dead pipeline by
   mistake.
7. **[Medium] No CI, no tests.** The only quality signal is a manually-run benchmark script
   that itself only re-runs the same insufficient linter. Nothing runs automatically on a PR.
8. **[Low-medium] Type-safety gaps at exactly the riskiest boundary.** 33 `: any` usages
   against a `strict: true` tsconfig, concentrated in `route.ts`'s response-shaping code,
   `linter.ts`, and `entityResolver.ts` — the compiler cannot catch shape mismatches in the
   three places a shape mismatch would matter most.

---

# Repository Health

| Dimension | Score | Why |
|---|---|---|
| Architecture | 6/10 | The DAG → ontology → fact-script → provenance-tagged-prose design is sound and closely matches `CLAUDE.md`'s 12-layer separation goal. Loses points for the unpruned dead generations and the missing cache quality gate — the design is good, the guardrails around it are incomplete. |
| Code Quality | 5/10 | `strict: true` TypeScript, but escaped by 33 `any` usages exactly where type safety matters most; zero tests; 66 raw `console.*` call sites as the only logging; three independently-maintained banned-word lists (`linter.ts`, `documentaryWriter.ts`, `stylePolish.ts`) that must be kept in sync by hand; three near-duplicate category-heuristic implementations (`search/autocomplete.ts`, `editorial/related.ts`, and the unused `search/categories.ts`). |
| Documentation | 8/10 | As of this audit, `docs/` fully and accurately covers product, UI, architecture, roadmap, decisions, golden outputs, benchmarks, and prompts. Docked two points because none of it is enforced or linked from code comments, so it can drift again without a process to keep it current. |
| UI | 7/10 | The seven live components form a cohesive, premium, mobile-adapted, keyboard-navigable design language. Docked for the live `CLAUDE.md` violation in `FactCards.tsx` (raw surprise score) and for 14 dead components sitting in the same directory as a trap for the next contributor. |
| Knowledge Pipeline | 4/10 | The fact-script → provenance-tagged-prose design is a genuinely good hallucination guard on paper. In practice it is undermined by fallback paths that were never held to the same bar, and a linter that can't tell the difference. |
| Content Quality | 2/10 | This scores what a reader is actually served today from the committed cache, not the pipeline's theoretical ceiling: every flagship benchmark topic currently renders generic-fallback prose, placeholder structured facts, and unrelated "related topics." |
| Performance | 6/10 | Real Core Web Vitals awareness (dynamic `ssr:false` imports for below-the-fold components), an optional Redis response cache. Docked for raw `<img>` tags instead of `next/image` across every live component that renders a thumbnail, and for unbounded, unmeasured DAG compute cost on a cache miss (multiple sequential Gemini calls per topic). |
| Maintainability | 4/10 | No tests, no CI, no startup validation for `GEMINI_API_KEY` (its absence — or failure — is discovered silently, per call, which is very likely how the cache got poisoned in the first place). `reports/audits`, `reports/benchmarks`, `reports/releases` exist as empty directories — process scaffolding with no process behind it. |
| SEO | 7/10 | Real per-page metadata, Open Graph tags, JSON-LD `Article` schema, `sitemap.ts`/`robots.ts`. Docked because `metaDescription` is a naive `slice(0, 155)` of a summary that may itself be fallback-generated, and because topic aliasing (e.g. "Renaissance Art" vs. the canonical "Renaissance") is unverified for canonical-URL correctness. |
| **Overall** | **5/10** | A well-designed pipeline currently shipping its own worst-case output as canonical, with no gate that would catch it doing so, now fully documented and ready to fix in a specific, ordered way. |

---

# Root Cause Analysis

Every symptom below is traced to the exact deterministic application code responsible. None
of this is an LLM output-quality problem — each fallback template is hand-written, and each
detection gap is a specific regex/substring choice.

**Symptom: Timeline entries are contentless ("Pivotal era in 1957").**
Root cause: `getFallbackCompilation()` (`src/lib/knowledge/compiler.ts:130-141`) builds the
timeline from `article.extract.match(/\b(1\d{3}|2\d{3})\b/g)` — any 4-digit number in the
extract, with zero significance judgment — while `no_timeline_milestone_placeholder`
(`src/lib/knowledge/linter.ts:216-224`) only matches the substring `"significant
milestone"`, which this template never uses.

**Symptom: Reader questions are grammatically/semantically incoherent ("What represents the
starting motivation behind Causes?", "How do key chemical processes behave during Turning
Point?" — for a Historical Event chapter).**
Root cause: `getFallbackPlan()` (`src/lib/knowledge/narrativePlanner.ts:86-92`) applies a
fixed 5-element `fallbackQuestions` array by chapter *index*, with no awareness of ontology
or chapter subject matter — index 2 is always a chemistry-flavored question regardless of
whether the topic is a movie, a country, or a war. `readerQuestion` is never scanned by the
linter's banned-phrase check at all (only `briefSummary` and `cards[].summary` are checked,
`linter.ts:148-151`).

**Symptom: Structured facts read "Compiled detail for {field}" verbatim.**
Root cause: `getFallbackCompilation()` (`compiler.ts:121-127`) fills every ontology-required
field with this literal template string. `no_placeholder_wording`
(`linter.ts:110-125`) matches only the literal substrings `"placeholder"`, `"tbd"`, `"details
are na/n/a"`, `"unknown director/founder"` — none of which appear in "Compiled detail for."

**Symptom: The knowledge graph carries no information (`Topic HAS_PROPERTY
Detail_Aspect_1..8`).**
Root cause: `getFallbackGraph()` (`src/lib/knowledge/knowledgeGraph.ts:100-117`) pads short
graphs to a minimum of 8 triples with this synthetic filler once ontology-derived triples run
out, and `graph_connected` (`linter.ts:56-69`) passes trivially because the filler's subject
is always the topic title, which is by definition in `entityNames`.

**Symptom: Related topics / "read more" links are unrelated to the article** (e.g. Space
Race → "1948 Czechoslovak coup d'état"; Japan → "+81", ".jp").
Root cause: `getFallbackCompilation()`'s `relatedTopics: article.links.slice(0, 8)`
(`compiler.ts:171`) is a positional slice of the raw Wikipedia link list with zero relevance
filtering — while a real scored implementation, `getRelatedArticles()`
(`src/lib/editorial/wikipedia.ts:312-382`), already exists in the codebase and is simply
never called from the fallback path (or anywhere else).

**Symptom: Bad artifacts, once generated, never get better.**
Root cause: `saveLocalArtifact()` is called whenever `needsRecompilation && lintReport.passed`
(`dag.ts:204-206`), and `lintReport.passed` is achievable by fallback content for all the
reasons above. `needsRecompilation` itself (`dag.ts:43-48`) only re-checks compiler version,
ontology version, Wikipedia revision, and a source-text hash — never re-evaluates the
*content* that was previously written. There is no mechanism to say "this cached artifact was
low quality, recompile it" short of manually deleting the file.

**Symptom: A raw, uncalibrated "Surprise: 8/10" is shown to readers.**
Root cause: `FactCards.tsx:79` renders `item.surpriseScore` directly. In fallback mode that
score is literally `10 - array_index` (`compiler.ts`'s `getFallbackCompilation`, trivia
mapping) — not a measurement of anything.

---

# Highest ROI Improvements

Ranked highest ROI first (impact relative to effort, then de-risked by dependency order).

| # | Improvement | Impact | Effort | Risk | Files Affected | Dependencies | Expected Improvement |
|---|---|---|---|---|---|---|---|
| 1 | Add "Compiled detail for" pattern to `no_placeholder_wording` | High | Trivial | Low | `linter.ts` | None | Closes the #1 gap that lets fallback structured facts pass |
| 2 | Add "Pivotal era in" / "underwent core changes" pattern to `no_timeline_milestone_placeholder` | High | Trivial | Low | `linter.ts` | None | Closes the #1 gap that lets fallback timelines pass |
| 3 | Add `readerQuestion` to banned-phrase + malformed-question scanning | High | Small | Low | `linter.ts` | None | Catches the literal `CLAUDE.md` bad-example sentence at the source |
| 4 | Reject `HAS_PROPERTY`/`Detail_Aspect_N` triples in `graph_connected` | Medium-High | Trivial | Low | `linter.ts` | None | Forces real relationship data or an honest failure instead of filler |
| 5 | Add startup validation for `GEMINI_API_KEY` (fail loud, not silent-per-call) | High | Small | Low | `dag.ts` or a new `src/lib/env.ts`, `route.ts` | None | Directly addresses the likely root cause of the current cache poisoning |
| 6 | Add generation-provenance field to `KnowledgeArtifact` (`llm` vs `fallback` per stage) | Very High | Medium | Low | `types/knowledge.ts`, every `knowledge/*.ts` stage, `linter.ts` | None | Makes "how much of this artifact is real" a queryable fact, not a manual inspection |
| 7 | Add a cache quality gate refusing to persist artifacts above a fallback-field threshold | Very High | Medium | Medium | `dag.ts`, `store.ts` | #6 | Stops bad artifacts from ever becoming "canonical" again |
| 8 | Regenerate all 16 committed `knowledge/*.json` artifacts | Very High (user-visible) | Small (compute-bound) | Low | `knowledge/**` | #1-#7 confirmed working first | Every benchmark topic actually reflects real editorial output |
| 9 | Fix `FactCards.tsx` raw surprise-score display | Medium | Trivial | Low | `FactCards.tsx` | None | Direct `CLAUDE.md` compliance fix, ships independently of everything else |
| 10 | Wire fallback `relatedTopics` through the existing `getRelatedArticles()` scoring instead of a raw slice | High | Small-Medium | Low | `compiler.ts`, `editorial/wikipedia.ts` | None | Fixes relatedness even when the LLM path is unavailable |
| 11 | Consolidate the three banned-word lists (`linter.ts`, `documentaryWriter.ts`, `stylePolish.ts`) into one shared constant | Medium | Small | Low | new `src/lib/knowledge/bannedPhrases.ts`, 3 call sites | None | Removes a class of future drift bugs where one list is updated and the others aren't |
| 12 | Consolidate the three category-heuristic implementations (`search/autocomplete.ts`, `editorial/related.ts`, unused `search/categories.ts`) | Medium | Small | Low | 3 files → 1 shared function | None | One heuristic to tune instead of three that silently disagree |
| 13 | Add unit tests for `linter.ts` rules using the real (currently broken) cached artifacts as known-bad fixtures | High | Medium | Low | new test files, `linter.ts` | #1-#4 | Prevents regression of exactly the gaps this audit found |
| 14 | Add CI (lint + typecheck + build + benchmark) on every PR | High | Medium | Low | new `.github/workflows/*.yml` | None (benchmark step needs a `GEMINI_API_KEY` secret) | First automated quality signal the repo has ever had |
| 15 | Delete confirmed dead code (27 files: 13 `lib/editorial/*`, `geminiWriter.ts` + `editorial/validator.ts`, 14 `components/*`) | Medium | Small | Low (verify zero references first) | see `ARCHITECTURE.md` orphan list | Fresh grep confirmation immediately before deletion | Cuts the maintenance surface roughly in half in the affected directories |
| 16 | Centralize the hardcoded `"gemini-2.0-flash"` model string | Low-Medium | Trivial | Low | 8 files under `src/lib/knowledge/`, `src/lib/editorial/` | None | One-line model migrations instead of 8 |
| 17 | De-duplicate the `TRENDING_TOPICS`/`suggestions` arrays | Low | Trivial | Low | `app/page.tsx`, `SearchBar.tsx` | None | Removes a drift-prone duplicate |
| 18 | Replace raw `<img>` with `next/image` in live components | Medium | Medium | Low | `EditorialSlide.tsx`, `DiscoveryCarousel.tsx`, `FactCards.tsx` (none currently), `SearchBar.tsx` | None | Real LCP/CLS improvement, direct SEO/perf benefit |
| 19 | Add topic-alias regression coverage (e.g. "Renaissance Art" → "Renaissance") | Medium | Small | Low | `entityResolver.ts`, new test fixtures | None | Confirms canonical-URL and cache-key correctness for aliased searches |
| 20 | Reduce `any` usage at the `route.ts` response-shaping boundary with real per-ontology discriminated types | Medium | Medium-High | Medium | `route.ts`, `types/knowledge.ts`, `types/wiki.ts` | Best done after ontology-specific data shapes stabilize | Compile-time protection against the exact class of shape mismatch that's easy to introduce when hand-mapping `structuredFacts` |

---

# V18 Milestones

## Phase 1 — Knowledge Quality
- Land ROI items #1, #2, #3, #4 (linter pattern gaps).
- Land #5 (fail-loud env validation) and #6 (generation-provenance field).
- Land #7 (cache quality gate), gated on #6.
- Land #8 (regenerate all 16 committed artifacts) once the above are confirmed working.
- Deliverable: every committed `knowledge/*.json` artifact is either real LLM output or is
  honestly marked/rejected as fallback — no more silent pass.

## Phase 2 — Narrative Engine
- Replace the fixed-by-index `fallbackQuestions` array in `narrativePlanner.ts` with
  ontology-aware, chapter-aware question generation (even in fallback mode).
- Land ROI item #11 (consolidate banned-word lists).
- Audit and rewrite `getFallbackChapterScript()` / `getFallbackSummary()` /
  `getFallbackCard()` in `documentaryWriter.ts` and `factScript.ts` so fallback prose is built
  from the real compiled facts available, not generic connective templates ("motivating
  factors behind early phases of development").
- Deliverable: fallback-mode prose, while still lower quality than LLM prose, no longer
  contains sentences that would themselves fail a human editorial read.

## Phase 3 — Timeline Intelligence
- Replace "any 4-digit number in the extract" timeline extraction with a significance-scored
  approach (dates co-occurring with named entities/events score higher than incidental
  citation years).
- Real, specific event headlines instead of "Pivotal era in {year}" in fallback mode.
- Deliverable: `knowledge/country/japan.json`-class failures (a timeline anchored to the
  current year) become structurally impossible.

## Phase 4 — Related Topics
- Land ROI item #10 (wire fallback `relatedTopics` through `getRelatedArticles()` scoring).
- Add a relevance check to the linter so an unrelated related-topic list fails validation
  instead of passing silently.
- Deliverable: every related-topic/"read more" link has a defensible reason to be there,
  checked automatically.

## Phase 5 — Fact Cards
- Land ROI item #9 (fix the raw surprise-score UI violation) — ships independently, no
  dependencies, can go out immediately.
- Calibrate `surpriseScore` for real (define what "10" means) or replace it with a
  qualitative tier, and ensure it's never `10 - array_index` in fallback mode.
- Confirm Did-You-Know facts exclude raw lead-paragraph trivia per `CLAUDE.md`.
- Deliverable: `FactCards` fully complies with `CLAUDE.md`'s Did You Know rules.

## Phase 6 — SEO
- Build `metaDescription` only from a summary that has passed the Phase 1 quality gate, never
  from unvalidated/fallback text.
- Land ROI item #19 (topic-alias regression coverage) to confirm canonical URLs are stable
  for aliased search terms.
- Deliverable: SEO metadata is never built from content that wouldn't pass the content
  pipeline's own quality bar.

## Phase 7 — Performance
- Land ROI item #18 (`next/image` across live components).
- Measure and bound DAG compute cost on cache miss (multiple sequential Gemini calls per
  topic currently has no timeout/budget); consider parallelizing independent stages
  (`knowledgeGraph` and `factEvaluator` do not depend on each other's output and currently run
  sequentially in `dag.ts`).
- Deliverable: measured LCP/INP improvement, and a bounded worst-case latency for a
  cache-miss topic request.

## Phase 8 — Polish
- Land ROI items #13, #14 (tests + CI).
- Land ROI item #15 (delete confirmed dead code).
- Land ROI items #12, #16, #17, #20 (consolidate category heuristics, centralize model name,
  de-dupe trending topics, reduce `any` at the response boundary).
- Decide the fate of `KnowledgeGraph.tsx` (revive with a real data feed, or delete) — see
  Recommended Refactors below.
- Deliverable: the codebase reflects one architecture generation, with automated checks
  guarding against regression of everything fixed in Phases 1-7.

---

# Recommended Refactors

## Large Files

| File | Lines | Recommendation | Why |
|---|---|---|---|
| `VisualSnapshot.tsx` | 756 | **Rewrite** | Single component branching across 7 ontology-specific tab renderers (`isCreative`/`isPerson`/`isCountry`/`isHistory`/`isTech`/`isScience`/`isCompany`) with inline data-mapping `useMemo`s for each. Split into one file per ontology module plus a thin dispatcher. |
| `documentaryWriter.ts` | 416 | **Rewrite** | Mixes real LLM writer functions, six fallback template generators, `sanitizeBannedWords`, and provenance parsing in one file. Isolate the fallback generators into their own reviewed/tested module — that's where the product-breaking bugs actually live. |
| `linter.ts` | 369 | **Rewrite** | One ~370-line function with ~27 inline checks. Extract each rule into a named, independently unit-testable function (required for ROI item #13). |
| `wikipedia.ts` | 382 | **Keep** | Cohesive single-responsibility retrieval module; `getRelatedArticles()` inside it should gain a caller (Phase 4) but the file itself doesn't need restructuring. |
| `entityResolver.ts` | 354 | **Keep** | Cohesive; the two-pass Gemini classification + heuristic fallback structure is clear and doesn't need splitting. |
| `SearchBar.tsx` | 432 | **Rewrite (partially)** | The component itself is fine; its inline multi-signal ranking `useEffect` (lines ~86-119) duplicates and diverges from `search/ranking.ts`'s `rankSuggestions` — extract one shared ranking function both the client component and the `/api/autocomplete` route call. |

## Duplicate Logic

- **Search ranking exists twice.** `SearchBar.tsx`'s inline sort and
  `src/lib/search/ranking.ts`'s `rankSuggestions()` implement two different, overlapping
  scoring schemes for the same operation. **Should rewrite** — consolidate into one.
- **Category-guessing heuristic exists three times.** `search/autocomplete.ts` (inline),
  `editorial/related.ts` (inline, slightly different category set), and
  `search/categories.ts`'s unused `resolveCategoryFromList()` (the one clean, exported,
  reusable version). **Should rewrite** — delete the two inline copies, wire both call sites
  to the existing exported function.
- **Six fallback generators, six independent designs.** `getFallbackCompilation`,
  `getFallbackGraph`, `getFallbackEvaluation`, `getFallbackPlan`, `getFallbackChapterScript`,
  `getFallbackSummary`/`getFallbackCard` each invent their own template language with no
  shared helper or shared quality bar. **Should rewrite** as one reviewed, tested
  fallback-generation module (this is also where Phase 2's narrative-engine fix belongs).
- **Three banned-word lists.** `linter.ts`'s `BANNED_AI_WORDS_PHRASES`,
  `documentaryWriter.ts`'s prompt-embedded forbidden list, and
  `stylePolish.ts`'s prompt-embedded forbidden list overlap substantially but are three
  separately hand-maintained arrays. **Should rewrite** — one shared constant, per ROI #11.

## Dead Code

**Should remove**, once a fresh grep re-confirms zero references immediately before deletion
(per `ARCHITECTURE.md`'s orphan list): all 13 files in `src/lib/editorial/` other than
`wikipedia.ts`, `cache.ts`, `related.ts`; `src/lib/knowledge/geminiWriter.ts` and its sole
consumer `src/lib/editorial/validator.ts`; all 14 orphaned files in `src/components/`.

## Obsolete Components

- **`KnowledgeGraph.tsx`** (React Flow node-graph view, styled for the V14.5 visual
  language, zero current callers). **Should rewrite-and-revive or remove** — a deliberate
  decision either way, not silence. The pipeline already produces `GraphTriple[]` data that
  could feed a revived version once Phase 1's graph-meaningfulness fix (ROI #4) ensures that
  data is worth visualizing.
- The other 13 dead components (`ArticleCard`, `Carousel`, `HeroImage`, `PerspectiveGrid`,
  `RelatedArticles`, `RelatedJourney`, `Timeline`, `TimelineCard`, `PeopleAlsoExplored`,
  `AISummary`, `EmptyState`, `Loading`, `VisualModules`) — **should remove**. No pending
  design rationale to keep them, unlike `KnowledgeGraph.tsx`.

## Temporary Hacks

- **`sanitizeBannedWords()` as a bolt-on second-pass regex filter.** **Should keep** as a
  pattern — defense-in-depth after an LLM call is legitimate and cheap. But its word list
  should stop being its own independent copy (see Duplicate Logic above).
- **`reports/audits`, `reports/benchmarks`, `reports/releases` as empty directories.**
  **Should rewrite** — either have `run-benchmarks.ts` actually write timestamped output
  there (closing the loop with Phase 8's CI work) or remove the placeholder directories; an
  empty scaffold with no process behind it is worse than no scaffold.

## Legacy Code

- The entire V13/V14 `editorial/` pipeline generation and the V14.5 component generation —
  **should remove**, covered under Dead Code above.

## Unused APIs

- **`getRelatedArticles()`** (`editorial/wikipedia.ts`) — **should keep and wire up**, per
  Phase 4 / ROI #10. It is the fix for the related-topics problem, sitting unused.
- **`resolveCategoryFromList()`** (`search/categories.ts`) — **should keep and wire up**, per
  the Duplicate Logic consolidation above.

## Unused Prompts

- `geminiWriter.ts`'s `writeBriefSummary()` and `writeChapterCard()` prompts — **should
  remove** along with the rest of that dead file; fully superseded by
  `documentaryWriter.ts`'s `writeDocumentarySummary()`/`writeDocumentaryCard()`.

## Unused Benchmark Logic

- None of `scripts/run-benchmarks.ts` itself is unused, but it has no output-persistence step
  (`reports/benchmarks` is empty) and no assertion for generation-provenance (it cannot
  currently tell you *how* an artifact passed). **Should rewrite** once Phase 1's
  generation-provenance field (ROI #6) exists, to assert on it directly rather than trusting
  `lintArtifact()` alone.

---

# Future Architecture

The diagram below is what the same product vision — ontology-driven, fact-before-prose,
provenance-tracked, documentary UX, Wikipedia-only sourcing — would look like built today,
with this audit's findings designed out from the start rather than patched on.

## Knowledge Pipeline

```
                         ┌─────────────────────────────┐
                         │   Wikipedia + Wikidata       │
                         │   (dual source, not LLM-only │
                         │   for structured facts)      │
                         └───────────────┬──────────────┘
                                         │
                         ┌───────────────▼──────────────┐
                         │  Retrieval                    │
                         │  - article extract/lead        │
                         │  - Wikidata claims (P-props)   │
                         └───────────────┬──────────────┘
                                         │
                         ┌───────────────▼──────────────┐
                         │  Entity Resolution             │
                         │  - Wikidata instance-of/       │
                         │    subclass-of as primary      │
                         │    signal, LLM as fallback     │
                         │    classifier only              │
                         └───────────────┬──────────────┘
                                         │
                         ┌───────────────▼──────────────┐
                         │  Ontology Mapping               │
                         │  (unchanged — this layer works) │
                         └───────────────┬──────────────┘
                                         │
                         ┌───────────────▼──────────────┐
                         │  Knowledge Compiler             │
                         │  - Wikidata-sourced fields       │
                         │    filled WITHOUT an LLM call    │
                         │    (dates, population, etc.)     │
                         │  - LLM fills only fields that     │
                         │    genuinely require synthesis    │
                         │  - generation_source: "wikidata"  │
                         │    | "llm" | "fallback" per field │
                         └───────────────┬──────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
          ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
          │ Knowledge Graph   │ │ Fact Evaluator     │ │ Related-Entity   │
          │ (Wikidata triples │ │ (unchanged design) │ │ Scorer           │
          │  + LLM enrichment,│ │                    │ │ (real scoring on │
          │  never synthetic  │ │                    │ │  EVERY path, no  │
          │  filler)          │ │                    │ │  raw-slice mode) │
          └─────────┬────────┘ └─────────┬─────────┘ └────────┬────────┘
                    └────────────────────┼─────────────────────┘
                                         ▼
                         ┌───────────────────────────────┐
                         │  Narrative Planner               │
                         │  - ontology + chapter aware       │
                         │    even in fallback mode          │
                         └───────────────┬──────────────────┘
                                         ▼
                         ┌───────────────────────────────┐
                         │  Fact Script (unchanged design)  │
                         └───────────────┬──────────────────┘
                                         ▼
                         ┌───────────────────────────────┐
                         │  Documentary Writer               │
                         │  (unchanged design, shared        │
                         │   banned-word constant)           │
                         └───────────────┬──────────────────┘
                                         ▼
                         ┌───────────────────────────────┐
                         │  Style Polish (unchanged)         │
                         └───────────────┬──────────────────┘
                                         ▼
                         ┌───────────────────────────────┐
                         │  Validation Gate (see below)      │
                         └────────────────────────────────┘
```

## Generation Pipeline (provenance-tracked, cross-cutting)

```
Every stage function returns:
  { value: T, source: "wikidata" | "llm" | "fallback", confidence: number }

instead of just T. The artifact carries a generation-provenance summary:

  KnowledgeArtifact.generationSummary = {
    llmFieldCount: number,
    fallbackFieldCount: number,
    wikidataFieldCount: number,
    fallbackRatio: number   // fallbackFieldCount / totalFields
  }

This single addition is what makes every downstream fix (cache gate, benchmark assertions,
alerting) possible without inspecting artifact content by hand.
```

## Caching

```
   compile attempt
         │
         ▼
 ┌───────────────┐     fallbackRatio > threshold?     ┌──────────────────┐
 │ Lint + Score   │ ───────────────yes────────────────▶│ DO NOT CACHE       │
 │ (semantic, not │                                     │ Serve response      │
 │  substring)    │                                     │ live, log a         │
 └───────┬────────┘                                     │ "degraded" metric   │
         │no                                             └──────────────────┘
         ▼
 ┌───────────────────┐
 │ Write to canonical  │   dependency hash unchanged?
 │ store (knowledge/)   │──────────yes──────────▶ serve cached, skip recompute
 └───────────────────┘
         │
         ▼
 Optional Redis response cache (unchanged — this layer is fine as-is)
```

## API

```
POST /api/analyze
   │
   ├─▶ Redis response cache check (unchanged)
   ├─▶ processKnowledgeDAG()  (see Knowledge Pipeline above)
   ├─▶ response shaping — typed per-ontology discriminated union,
   │     not `mappedStructuredFacts: any`
   ├─▶ SEO metadata — built only from fields whose generationSummary
   │     shows fallbackRatio below threshold
   └─▶ cache + return

GET /api/autocomplete
   └─▶ single shared ranking function (also used by SearchBar client-side),
         single shared category heuristic (search/categories.ts, wired up)
```

## Frontend

```
Unchanged structurally — the seven live components and their design language
(docs/UI_GUIDELINES.md) are good. Two additions:

  - next/image everywhere a thumbnail renders
  - a "generation quality" affordance is NOT surfaced to readers (that would look broken
    to a general audience) — it stays a server-side/ops signal only
```

## Benchmark System

```
scripts/run-benchmarks.ts
   │
   ├─▶ per-topic: ontology match ✓/✗ (unchanged)
   ├─▶ per-topic: lintArtifact() semantic pass ✓/✗ (Phase 1 rules)
   ├─▶ per-topic: generationSummary.fallbackRatio assertion
   │     (fails loudly if a topic silently fell back)
   ├─▶ writes timestamped JSON to reports/benchmarks/ (closing the empty-directory gap)
   └─▶ CI-gated on every PR (Phase 8)
```

## Validation

```
lintArtifact() rules become independently testable functions:

  rules/placeholderCheck.ts     rules/timelineCheck.ts
  rules/graphMeaningfulness.ts  rules/readerQuestionCheck.ts
  rules/provenanceCheck.ts      rules/documentaryScoreCheck.ts
  ... (one file per rule family, unit-tested against the real broken
      artifacts this audit found as permanent regression fixtures)
```

## Search

```
Wikipedia OpenSearch ──▶ shared ranking function ──▶ shared category heuristic
        (used identically by /api/autocomplete and SearchBar's client-side re-rank —
         today these are two different implementations of the same idea)
```

## Related Entities

```
compiled facts ──▶ getRelatedArticles() scoring (entity overlap, graph proximity,
                     link overlap, popularity) ──▶ ALWAYS applied, LLM path or not
                     (today this scoring exists but only the LLM path benefits from
                      anything resembling relevance filtering)
```

## Media Pipeline (new — does not exist today)

```
Wikipedia lead thumbnail (existing, only current source)
        +
Wikimedia Commons search (per named entity / chapter anchor) ── new
        +
next/image optimization at render time ── new
        │
        ▼
one thumbnail today → a real per-chapter image set tomorrow, still Wikipedia/Commons-only
(no external stock imagery — stays consistent with "Wikipedia is the only knowledge source")
```

---

# Release Plan

**Recommended order: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 6 → Phase 7 → Phase 8,
with Phase 5 shipped in parallel at any point.**

**Why Phase 1 first, non-negotiably:** every other phase either depends on it directly (the
cache quality gate and generation-provenance field are load-bearing for Phases 2-4's
"did this actually get better" measurement) or is undermined without it (there is no point
polishing SEO metadata built from a summary that might still be fallback text). This also
matches `CLAUDE.md`'s own stated priority: no major UI redesign until the content pipeline is
correct. Phase 1 is the content pipeline being correct.

**Why Phase 2 before Phase 3 and Phase 4:** narrative-engine quality (coherent reader
questions, real chapter prose) is the single most reader-visible failure mode after Phase 1's
structured-fact fixes — a reader hits the incoherent question before they hit the timeline or
the related-topics carousel, since it's the first thing rendered by `EditorialCarousel`.

**Why Phase 3 before Phase 4:** the timeline appears above the related-topics carousel in
the actual page layout (`results/page.tsx` renders `KnowledgeJourney` before
`DiscoveryCarousel`), and timeline quality is currently *more* broken (nonsensical dates
like Japan's "2026") than related-topic quality (which at least sometimes produces plausible
results, per `GOLDEN_OUTPUTS.md`'s Inception example).

**Why Phase 5 (Fact Cards) is the one exception to strict ordering:** the surprise-score UI
fix has no dependency on anything else, touches one component, and is a direct compliance
fix for an explicit, named `CLAUDE.md` rule. There is no reason to hold it hostage to the
knowledge-pipeline work — ship it whenever convenient, ideally immediately.

**Why Phase 6 (SEO) after Phase 1-4, not before:** `metaDescription` construction should
depend on validated, non-fallback summary text (Phase 1's quality gate) and on stable
canonical URLs for aliased topics, which requires entity-resolution behavior that's easiest
to verify once the rest of the pipeline is trustworthy — sequencing SEO work earlier would
mean re-doing it once Phase 1 changes what "the summary" even is.

**Why Phase 7 (Performance) after content correctness, not before:** optimizing image
delivery and DAG latency for content that's about to be substantially rewritten (Phase 1-4)
risks wasted work — e.g., a media pipeline (Phase 7 media work) built against today's
single-thumbnail model would need rework once Phase 1's generation-provenance data enables
smarter per-chapter image selection.

**Why Phase 8 (Polish) last:** dead-code removal, list consolidation, and CI setup are all
low-risk and don't block anything upstream, but skipping them is also low-cost in the short
term — which is exactly why they're the phase most likely to get silently dropped if not
scheduled explicitly. Landing CI (Phase 8) specifically at the end means it can be written
once against the *final* Phase 1-7 shape of the codebase, rather than needing updates as each
earlier phase lands.
