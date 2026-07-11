# Engineering Decision Log

This reconstructs the significant architectural decisions actually present in the code,
mapped to the release each one shipped in (per `git log`: V13 → V14 → V14.5 → V15 → V16 →
V17). It is a record of what was decided and why the code implies it was decided that way —
not a request for re-litigation.

## V13 — Structured knowledge layer (`src/lib/editorial/` first generation)

**Decision:** Build a Wikipedia → structured-facts → prose pipeline as `editorial/classifier.ts`,
`extractor.ts`, `factAssignment.ts`, `planner.ts`, `factsCurator.ts`, `perspectives.ts`.

**Consequence:** Entirely superseded by later releases. Zero references remain anywhere in
`src/app`. Never deleted — see Technical Debt below.

## V14 — Ontology-driven editorial engine (`editorial/planner/*.ts`)

**Decision:** Give each entity type its own planner module (`bookPlanner.ts`,
`companyPlanner.ts`, `countryPlanner.ts`, `historyPlanner.ts`, `moviePlanner.ts`,
`organizationPlanner.ts`, `personPlanner.ts`, `sciencePlanner.ts`, `technologyPlanner.ts`).

**Consequence:** Also fully superseded — the current ontology system
(`src/lib/ontology/ontologyEngine.ts`) replaced nine separate planner files with one
data-driven `ONTOLOGY_DEFINITIONS` map. The nine planner files remain in the tree, unused.

## V14.5 — Interactive documentary results page redesign

**Decision:** First component-based results page: `ArticleCard`, `Carousel`, `HeroImage`,
`PerspectiveGrid`, `RelatedArticles`, `RelatedJourney`, `Timeline`, `TimelineCard`,
`KnowledgeGraph` (a React Flow node-graph visualization), `PeopleAlsoExplored`, `AISummary`,
`EmptyState`, `Loading`.

**Consequence:** Also fully superseded by V17's `EditorialCarousel` / `VisualSnapshot` /
`FactCards` / `KnowledgeJourney` / `DiscoveryCarousel`. 14 of the 21 files in
`src/components/` are now dead.

## V15 — Knowledge Operating System and canonical artifact compiler

**Decision:** Replace ad hoc editorial function calls with a formal DAG
(`src/lib/knowledge/dag.ts`), a typed `KnowledgeArtifact` schema (`src/types/knowledge.ts`),
and a local JSON file store (`src/lib/knowledge/store.ts`) as the canonical cache under
`knowledge/`, keyed by a dependency hash of compiler version + ontology version + Wikipedia
revision + source-text checksum.

**Rationale (inferred from code):** treat a compiled topic as a versioned artifact, not a
request-scoped computation, so repeat traffic doesn't re-pay LLM cost.

**Consequence:** this is also *why* a stale or fallback-quality artifact, once written under
the current `COMPILER_VERSION`, is served indefinitely — the cache invalidates on version/hash
mismatch only. It has no independent quality gate. This is the direct mechanism behind the
central finding in [`BENCHMARKS.md`](BENCHMARKS.md): all 16 committed artifacts are
fallback-authored and will keep being served as-is until someone bumps `COMPILER_VERSION` or
manually deletes them.

## V16 — Fact-script pipeline and documentary writer

**Decision:** Insert an explicit `FactScript` stage (`src/lib/knowledge/factScript.ts`)
between narrative planning and prose generation. The documentary writer
(`documentaryWriter.ts`) is prompted only with this pre-approved, non-prose bullet list — it
never sees raw Wikipedia text again.

**Rationale:** prevent hallucination by construction, not just by instruction. Every
generated sentence carries a `[Fact X]` tag back to a specific source bullet
(`parseProvenanceAndClean()`), and that mapping is independently re-verified by the linter's
`sentence_provenance_ok` rule rather than trusted at generation time.

## V17 — Ontology-aware editorial engine, deterministic storytelling pipeline, UX, search

**Decision:** Add the linter's V17 rule set — `documentaryScore`, the banned-phrase list,
the exact six-sentence alternating documentary pattern, fact-density and "curiosity" checks —
plus `sanitizeBannedWords()` as a second, independent text filter applied after generation
regardless of source (LLM or fallback), plus the current multi-signal autocomplete ranking
in `SearchBar.tsx`.

**Rationale:** don't trust the prompt alone to avoid corporate/AI-sounding language — enforce
it again mechanically, twice, after generation.

**Consequence worth flagging:** more rules were added, but they are still pattern/substring
checks against specific known-bad phrases, not semantic checks. See Technical Debt below and
[`BENCHMARKS.md`](BENCHMARKS.md) for what this misses in practice.

## Cross-cutting — Fallback-first resilience design

**Decision:** every single Gemini call, in every pipeline stage, is wrapped in try/catch with
a fully-specified deterministic fallback generator (`getFallback*()` functions throughout
`src/lib/knowledge/*.ts`), so the pipeline never throws on LLM failure or missing API key.

**Rationale:** uptime and local-dev resilience — the app works with zero API key configured.

**Consequence (the central finding of this audit):** the fallback generators produce exactly
the boilerplate the product's own content rules forbid — `"Pivotal era in {year}"`,
`"What represents the starting motivation behind {chapterTitle}?"` (the literal bad-example
sentence quoted in `CLAUDE.md`), `"Compiled detail for {field}"` — and because the linter's
checks are pattern-based rather than semantic, this fallback output routinely reports
`validationStatus.passed: true`. Confirmed present in all 16 committed artifacts under
`knowledge/`.

## Cross-cutting — Optional Redis response cache

**Decision:** layer an Upstash Redis REST-API response cache
(`src/lib/editorial/cache.ts`) on top of the local JSON canonical store, silently no-op'ing
(`return null` / `return false`) when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (or
the Vercel KV equivalents) are unset.

**Rationale:** zero-config in local dev, CDN-ish response caching in production, without
coupling the app to a specific provider's SDK (plain `fetch` against the REST API).

---

## Technical Debt

Concrete, file-referenced, in rough priority order:

1. **Cache poisoning.** All 16 committed `knowledge/*.json` artifacts (every benchmark
   topic) are fallback-authored despite `GEMINI_API_KEY` being present in `.env.local`.
   Because `dag.ts` only recompiles on dependency-hash mismatch, they will keep serving
   fallback content indefinitely. Root cause (invalid/exhausted key vs. cache predating the
   key) is not diagnosable from the repo alone and should be checked directly.

2. **Linter/benchmark blind spots** (`src/lib/knowledge/linter.ts`):
   - `no_placeholder_wording` matches literal substrings `"placeholder"`, `"tbd"`,
     `"details are na/n/a"`, `"unknown director/founder"` — it does **not** match the
     fallback compiler's actual placeholder text, `"Compiled detail for {field}"`.
   - `no_timeline_milestone_placeholder` matches only the substring `"significant
     milestone"` — it does **not** match the fallback timeline's actual text, `"Pivotal era
     in {year}"` / `"underwent core changes and reached major development"`, both of which
     are the literal banned examples in `CLAUDE.md`.
   - `graph_connected` passes trivially on fallback graphs because the fallback's synthetic
     triples (`{title} HAS_PROPERTY Detail_Aspect_N`) always use the topic title as subject,
     which is definitionally in `entityNames`.
   - `readerQuestion` is never checked against `BANNED_AI_WORDS_PHRASES` or for
     well-formedness at all — the fallback narrative planner's
     `"What represents the starting motivation behind {chapterTitle}?"` passes cleanly.
   - No check that `relatedTopics` / `readMoreTopic` values are actually related to the
     source topic. In fallback mode they come positionally from the raw Wikipedia link list;
     `knowledge/historical_event/space-race.json`'s related topics include "1948
     Arab–Israeli War" and "1948 Czechoslovak coup d'état."

3. **Dead code**, ~27 files, zero references (full list in
   [`ARCHITECTURE.md`](ARCHITECTURE.md#orphaned-code-not-part-of-the-live-architecture)):
   13 files in `src/lib/editorial/`, `src/lib/knowledge/geminiWriter.ts` (plus its sole
   consumer `editorial/validator.ts`), and 14 files in `src/components/`.

4. **Live UI rule violation.** `FactCards.tsx` renders `Surprise: {item.surpriseScore}/10`
   directly — `CLAUDE.md` explicitly prohibits exposing an uncalibrated numeric surprise
   score in the UI.

5. **Duplicated, drifting data.** The featured-topics list (Space Race, Roman Empire,
   Renaissance Art, Quantum Computing, Napoleon Bonaparte, Taj Mahal) is hand-duplicated
   between `app/page.tsx`'s `suggestions` array and `SearchBar.tsx`'s `TRENDING_TOPICS`
   array, in a different order, with no shared source of truth.

6. **Hardcoded model name.** The string `"gemini-2.0-flash"` is repeated across at least 8
   separate files instead of a single config constant — a model migration means 8 find/replace
   edits instead of one.

7. **`src/lib/editorial/wikipedia.ts`'s `getRelatedArticles()` and `src/lib/search/categories.ts`**
   are fully implemented, scored heuristics with no callers anywhere in the app.
