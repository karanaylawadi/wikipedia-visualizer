# Architecture

```
Wikipedia
  ↓
Retrieval
  ↓
Entity Resolution
  ↓
Knowledge Processing
  ↓
Narrative Planning
  ↓
Documentary Generation
  ↓
API
  ↓
Frontend
  ↓
Rendering
```

The whole pipeline is conducted by a single function, `processKnowledgeDAG()` in
[`src/lib/knowledge/dag.ts`](../src/lib/knowledge/dag.ts). Every stage below is a numbered
step inside that function unless noted otherwise. Every stage that calls Gemini has a
deterministic, fully-specified fallback path that runs when the call fails or
`GEMINI_API_KEY` is unset — this is the single most important fact about this architecture,
because the fallback paths are what currently populate the entire canonical cache (see
[`DECISIONS.md`](DECISIONS.md) and [`BENCHMARKS.md`](BENCHMARKS.md)).

## 1. Retrieval

**[`src/lib/editorial/wikipedia.ts`](../src/lib/editorial/wikipedia.ts)**

- `getArticleIntelligence(query)` — the primary fetch. Calls Wikipedia's `query` and `parse`
  REST/action APIs in parallel to get the extract, lead paragraph, section headings,
  wikitext, links, categories, and thumbnail. Returns `ArticleIntelligence`.
- `searchWikipedia(query)` — fallback path when `getArticleIntelligence` can't resolve a
  title; used by both `/api/analyze` and `scripts/run-benchmarks.ts`.
- `getRelatedArticles(query)` — a scored related-article heuristic (title occurrence in lead,
  body occurrence, category overlap, section-heading overlap, infobox mention). **Not called
  anywhere in the live app** — related topics on the results page come from the LLM
  compiler's `relatedTopics` output instead, curated further in stage 8 below.

Search-time retrieval (autocomplete, separate from the analyze pipeline):
**[`src/lib/search/autocomplete.ts`](../src/lib/search/autocomplete.ts)** (Wikipedia
OpenSearch + category heuristics) and
**[`src/lib/search/ranking.ts`](../src/lib/search/ranking.ts)** (exact/prefix-match sort).
`src/lib/search/categories.ts` exists but has no callers.

## 2. Entity Resolution

**[`src/lib/knowledge/entityResolver.ts`](../src/lib/knowledge/entityResolver.ts)** —
`resolveEntity(topic)`

1. Fetches Wikipedia metadata (pageid, wikidata ID, description, categories) directly via the
   MediaWiki `action=query` API — independent of stage 1's fetch.
2. If no `GEMINI_API_KEY`, classifies with `runHeuristicClassification()` — a hand-written
   keyword ladder (title contains "einstein" → Person, "apple inc"/"nvidia" → Company, etc.,
   falling through to a longer categories/extract keyword scan, defaulting to "Scientific
   Concept").
3. With a key, does a two-pass Gemini classification: pass 1 classifies against a fixed list
   of 27 `SUPPORTED_ENTITIES`; if confidence `< 0.95`, pass 2 re-runs disambiguation against
   the top 5 Wikipedia search candidates and can change the resolved title entirely.

Output is a `ResolvedEntity`: `entityType`, `confidence`, `reasoning`, `canonicalTitle`,
`aliases`, `wikipediaPageId`, `wikidataId`.

## Ontology Mapping (cross-cutting)

**[`src/lib/ontology/ontologyEngine.ts`](../src/lib/ontology/ontologyEngine.ts)** —
`mapEntityTypeToOntology()` collapses the 27 raw entity types down to **9 ontologies**:
Movie, Country, Historical Event, Art Movement, Person, Company, Technology, Science,
Organization (Science is the default fallback for anything unmapped). Each ontology defines:

- `requiredFields` — checked by `validateOntologyFields()`, gates the linter's
  `required_fields_exist` rule.
- `timelineSchema` — min/max timeline event count.
- `documentaryBlueprint` — the ordered chapter titles for that ontology (e.g. Movie:
  Story → Production → Release → Reception → Legacy).
- `triviaStrategy` — a prompt hint for what kind of trivia to surface.
- `validationRules` — descriptive only; not machine-enforced beyond `requiredFields`.

Every downstream stage (compiler, narrative planner, linter) reads this definition.

## 3. Knowledge Processing

**[`src/lib/knowledge/compiler.ts`](../src/lib/knowledge/compiler.ts)** — `compileKnowledge()`
prompts Gemini to extract the ontology's `requiredFields` as raw structured facts (explicitly
*not* prose), plus a timeline, 8–12 trivia candidates, named entities, related topics, and
per-section bullet summaries. Fallback: `getFallbackCompilation()` fills required fields with
the literal string `"Compiled detail for {field}"` and synthesizes a timeline from every
4-digit year found in the extract with the headline `"Pivotal era in {year}"`.

**[`src/lib/knowledge/knowledgeGraph.ts`](../src/lib/knowledge/knowledgeGraph.ts)** —
`buildKnowledgeGraph()` prompts for 8–15 subject/predicate/object triples with uppercase
active predicates (`DIRECTED`, `FOUNDED_BY`, `CAPITAL_OF`, etc.). Fallback:
`getFallbackGraph()` derives a handful of triples from whatever structured fields exist, then
pads to 8 triples with synthetic `{title} HAS_PROPERTY Detail_Aspect_N` filler.

**[`src/lib/knowledge/factEvaluator.ts`](../src/lib/knowledge/factEvaluator.ts)** —
`evaluateFacts()` scores every candidate fact (from trivia + source-section bullets) on 7
weighted metrics (confidence, specificity, narrative/educational/visual value, uniqueness,
ontology relevance) and drops anything scoring below 0.65 or matching
`FORBIDDEN_WEAK_PHRASES` (`isFactWeak()`, also reused by the linter). Fallback:
`getFallbackEvaluation()` scores facts purely on whether they contain a year/percentage/dollar
figure.

## 4. Narrative Planning

**[`src/lib/knowledge/narrativePlanner.ts`](../src/lib/knowledge/narrativePlanner.ts)** —
`planNarrative()` asks Gemini to fill in the ontology's fixed chapter-count blueprint with a
topic-specific title, reader question, 2–3 objectives, 2–3 approved facts, and 2–3 anchor
entities per chapter, explicitly forbidding generic chapter titles. Fallback:
`getFallbackPlan()` — this is where the canonical "bad reader question" example in
`CLAUDE.md` literally comes from: `` `What represents the starting motivation behind
${chapterTitle}?` ``.

**[`src/lib/knowledge/factScript.ts`](../src/lib/knowledge/factScript.ts)** —
`generateFactScript()` converts each chapter's plan into a strict `FactScriptChapter`: raw
entity/date/location/people/event lists plus one-sentence `cause`, `effect`, and `takeaway`
fields. This is the guardrail stage — the documentary writer (next stage) is never shown raw
Wikipedia text again, only this pre-approved bullet script. Fallback templates use phrases
like `"motivating factors behind early phases of development"` — themselves on `CLAUDE.md`'s
banned-phrase list.

## 5. Documentary Generation

**[`src/lib/knowledge/documentaryWriter.ts`](../src/lib/knowledge/documentaryWriter.ts)**

- `writeDocumentarySummary()` — turns the fact script into a 100–125 word intro, one
  `[Fact X]`-tagged sentence at a time.
- `writeDocumentaryCard()` — turns one chapter's fact script into an exact six-sentence
  alternating pattern (fact → cause → fact → effect → fact → takeaway), each sentence
  fact-tagged.
- `parseProvenanceAndClean()` — strips the `[Fact X]` tags back out into a
  `{ sentence, fact }[]` provenance array, which the linter later re-validates
  (`sentence_provenance_ok`).
- `sanitizeBannedWords()` — a second, independent regex substitution pass (framework→basis,
  leveraged→used, therefore→thus, etc.) applied to *all* generated text regardless of whether
  it came from the LLM or a fallback template. This is a deliberate defense-in-depth choice:
  don't trust the prompt alone.

**[`src/lib/knowledge/stylePolish.ts`](../src/lib/knowledge/stylePolish.ts)** —
`polishDocumentary()` is a final LLM pass that rewrites the summary and each card for rhythm
only, constrained to preserve the exact sentence count so provenance mapping still lines up.
No-ops if `GEMINI_API_KEY` is absent.

**[`src/lib/knowledge/linter.ts`](../src/lib/knowledge/linter.ts)** — `lintArtifact()` runs
~27 rule checks (ontology fields, timeline bounds/order, graph connectivity, weak/duplicate
facts, placeholder wording, banned phrases, paragraph length, generic titles, provenance
completeness, fact density, the six-sentence alternating pattern) and computes a
`documentaryScore` (100, minus itemized deductions) gated at `>= 80`. Produces a `LintReport`
stored as `validationStatus` on the artifact. **This is the quality gate, and its specific
blind spots are documented in [`BENCHMARKS.md`](BENCHMARKS.md).**

## Orchestration & Storage (cross-cutting)

**[`src/lib/knowledge/store.ts`](../src/lib/knowledge/store.ts)** — the `knowledge/` directory
is the canonical artifact store: one JSON file per topic, path derived from ontology name and
a slugified title (`getArtifactPath()`). `COMPILER_VERSION` / `ONTOLOGY_VERSION` are both
`"v17.0"`. `dag.ts` only recompiles a topic when the cached artifact's compiler version,
ontology version, Wikipedia revision, or a dependency hash (compiler+ontology version +
Wikipedia revision + source-text checksum) disagrees with the current run — otherwise it
serves the cached artifact unchanged, calling this an "incremental cache hit."

## 6. API

**[`src/app/api/analyze/route.ts`](../src/app/api/analyze/route.ts)** — `POST` handler.
Checks an optional Upstash Redis response cache
(`src/lib/editorial/cache.ts` — silently no-ops if `UPSTASH_REDIS_REST_URL`/`TOKEN` or
`KV_REST_API_*` env vars are absent), then fetches the article (stage 1), runs
`processKnowledgeDAG()` (stages 2–5), maps the `KnowledgeArtifact` into the flatter
`structuredFacts` shape the frontend expects (including which ontology-specific data block —
`movieData`, `personData`, `countryData`, etc. — to attach), curates related-topic cards via
`curateRelatedExploration()` in `src/lib/editorial/related.ts` (a locally-computed similarity
score: entity overlap 0.3 + graph proximity 0.3 + link overlap 0.2 + popularity 0.2), builds
SEO metadata, and caches the full response.

**[`src/app/api/autocomplete/route.ts`](../src/app/api/autocomplete/route.ts)** — `GET`,
thin wrapper over the search-time retrieval described in stage 1.

## 7–9. Frontend & Rendering

**[`src/app/page.tsx`](../src/app/page.tsx)** — homepage, renders `SearchBar`.

**[`src/app/results/page.tsx`](../src/app/results/page.tsx)** — client component, fetches
`/api/analyze` on mount, dynamically imports (`ssr: false`) the four heaviest components for
Core Web Vitals, then renders in fixed order: header → `EditorialCarousel` → `VisualSnapshot`
→ `FactCards` → `KnowledgeJourney` → `DiscoveryCarousel` → footer.

Live rendering components (see [`UI_GUIDELINES.md`](UI_GUIDELINES.md) for the full design
language): `SearchBar.tsx`, `EditorialCarousel.tsx` + `EditorialSlide.tsx`,
`VisualSnapshot.tsx`, `FactCards.tsx`, `KnowledgeJourney.tsx`, `DiscoveryCarousel.tsx`,
`GoogleAnalytics.tsx`.

## Orphaned Code (not part of the live architecture)

Two full generations of prior architecture exist in the tree with zero live references,
confirmed by grep across `src/app`:

**Dead `src/lib/editorial/*` (V13's editorial engine + V14's per-ontology planners):**
`classifier.ts`, `entityClassifier.ts`, `extractor.ts`, `factAssignment.ts`, `facts.ts`,
`factsCurator.ts`, `perspectives.ts`, `planner.ts`, `planner/bookPlanner.ts`,
`planner/companyPlanner.ts`, `planner/countryPlanner.ts`, `planner/historyPlanner.ts`,
`planner/moviePlanner.ts`, `planner/organizationPlanner.ts`, `planner/personPlanner.ts`,
`planner/sciencePlanner.ts`, `planner/technologyPlanner.ts`, `retry.ts`, `summary.ts`,
`timeline.ts`. `validator.ts` has exactly one caller — `src/lib/knowledge/geminiWriter.ts`,
which is itself dead (only its `PerspectiveCard` *type* is imported by `route.ts`; its
`writeBriefSummary`/`writeChapterCard` functions were superseded by
`documentaryWriter.ts`'s `writeDocumentarySummary`/`writeDocumentaryCard` and are never
called).

**Dead `src/components/*` (V14.5's first results-page redesign, including a React Flow
node-graph view):** `AISummary.tsx`, `ArticleCard.tsx`, `Carousel.tsx`, `EmptyState.tsx`,
`HeroImage.tsx`, `KnowledgeGraph.tsx`, `Loading.tsx`, `PeopleAlsoExplored.tsx`,
`PerspectiveGrid.tsx`, `RelatedArticles.tsx`, `RelatedJourney.tsx`, `Timeline.tsx`,
`TimelineCard.tsx`, `VisualModules.tsx`.

Still-live from `src/lib/editorial/`: `wikipedia.ts`, `cache.ts`, `related.ts` only.

This is not a hypothetical risk — it is roughly 27 files of accumulated dead weight from two
superseded pipeline generations, still shipping in the bundle and still discoverable by
anyone searching the codebase for "how does X work." See [`DECISIONS.md`](DECISIONS.md) for
the removal recommendation.
