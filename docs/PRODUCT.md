# Product

## Vision

Visualizer.wiki turns a single Wikipedia article into a short interactive documentary: a
chapter-by-chapter editorial read, a "Did You Know" insight grid, a chronological timeline,
and a curated set of related topics to continue exploring. The product identity on the
homepage (`src/app/page.tsx`) calls it an "Interactive Encyclopedia" and promises
"historical timelines, AI-synthesized editorial briefings, and interactive connected concepts
maps for any Wikipedia subject."

The visual and editorial reference points, per [`CLAUDE.md`](../CLAUDE.md), are premium
publications — The New York Times, The Wall Street Journal, National Geographic, Apple's
editorial pages, Google Arts & Culture, The Pudding — not an AI chatbot or a dashboard. An
earlier draft of the product spec (`docs/PRODUCT_SPEC.md`, superseded but preserved for
history) framed the same ambition as "Apple's website meets Linear meets Notion."

Wikipedia is the only knowledge source. Nothing is invented. Every sentence the documentary
writer produces is required to trace back to a specific compiled fact
(`src/lib/knowledge/documentaryWriter.ts`, sentence-level `[Fact X]` provenance tagging,
enforced by `sentence_provenance_ok` in `src/lib/knowledge/linter.ts`).

## Audience

The product is built for general, curious readers arriving from search or direct exploration,
not researchers who need citations or primary sources. Evidence for this in the code:

- SEO is a first-class concern — `buildStage15SEO()` in `src/app/api/analyze/route.ts`
  generates meta titles, Open Graph tags, breadcrumbs, and JSON-LD `Article` schema for every
  topic page, and `src/app/sitemap.ts` / `src/app/robots.ts` exist to make pages discoverable.
- Google Analytics event tracking (`src/lib/gtag.ts`, wired into `SearchBar`,
  `EditorialCarousel`, `DiscoveryCarousel`) tracks `trackSearch`, `trackTopicOpened`,
  `trackCarouselCardClicked`, `trackRelatedTopicClicked` — funnel analytics for a public,
  browse-and-click audience, not an authenticated power-user product.
- The homepage's "Browse Categories" (History, Science, Art, Technology, Space, Companies,
  Books, Movies) and trending-topic suggestions (Space Race, Roman Empire, Napoleon
  Bonaparte, Renaissance Art, Quantum Computing, Taj Mahal) are broad, general-interest
  entry points, not a specialist toolset.

## User Journey

1. **Homepage** (`src/app/page.tsx`) — a search bar, trending topics, recent searches
   (from `localStorage`), and browse categories. No account, no onboarding.
2. **Search** — `SearchBar.tsx` debounces queries at 250ms against
   `GET /api/autocomplete`, which hits Wikipedia's OpenSearch API and ranks results with a
   multi-signal score (exact match, prefix match, current-graph-neighbor overlap, recency,
   trending status).
3. **Navigation** — selecting a topic routes to `/results?topic=<topic>`.
4. **Generation** — `results/page.tsx` POSTs to `/api/analyze`, which runs the full
   ten-stage knowledge pipeline (see [`ARCHITECTURE.md`](ARCHITECTURE.md)) and returns a
   single JSON payload.
5. **Reading** — the results page renders, in order: a title/category header, the
   `EditorialCarousel` chapter reader (the documentary itself), `VisualSnapshot`
   (ontology-specific structured-fact tabs), `FactCards` ("Did You Know"),
   `KnowledgeJourney` (chronological timeline), `DiscoveryCarousel` ("Continue the
   Journey" — related topics), and a footer link back to the source Wikipedia article.
6. **Continuation** — every related-topic, timeline-connection, and "read more" click
   re-enters the loop at step 4 with a new topic, via `router.push`.

## Product Philosophy

The pipeline is deliberately staged so that structured facts exist *before* any prose is
written, and prose is never allowed to depart from those facts:

- **Ontology first.** Every topic is classified into one of nine ontologies
  (`src/lib/ontology/ontologyEngine.ts`: Movie, Country, Historical Event, Art Movement,
  Person, Company, Technology, Science, Organization), each with its own required fields,
  timeline size bounds, documentary chapter blueprint, and validation rules. The UI and the
  writing prompts are ontology-aware, not one-size-fits-all.
- **Facts before sentences.** Compiled facts → knowledge graph → fact evaluation → narrative
  plan → fact script (raw bullets only, no prose) → documentary prose, in that order
  (`src/lib/knowledge/dag.ts`). The fact-script stage exists specifically to stop the prose
  writer from improvising: it is prompted only with pre-approved bullets, never raw Wikipedia
  text.
- **Machine-checked editorial rules, not just prompted ones.** `sanitizeBannedWords()` runs a
  second, independent regex pass over generated text after the LLM call returns, and
  `lintArtifact()` runs ~27 rule checks (banned phrases, generic chapter titles, sentence
  provenance, fact density, paragraph length, timeline chronology) before an artifact is
  allowed into the canonical cache.
- **Cache knowledge, not requests.** A compiled topic is a versioned artifact
  (`KnowledgeArtifact`, `src/types/knowledge.ts`), stored as canonical JSON under `knowledge/`
  and only recompiled when the compiler version, ontology version, or Wikipedia revision
  changes (`src/lib/knowledge/store.ts`, dependency-hash check in `dag.ts`).

## Current Limitations

These are drawn directly from what is in the repository today, not hypothetical risks:

- **The canonical cache is currently 100% fallback content.** Every one of the 16 committed
  artifacts under `knowledge/` (Space Race, Inception, Japan, Photosynthesis, Renaissance, and
  the rest of the benchmark set) contains the deterministic fallback text every pipeline stage
  falls back to when its Gemini call fails or is unavailable — not the premium editorial
  writing the product is built to produce. See [`BENCHMARKS.md`](BENCHMARKS.md) and
  [`GOLDEN_OUTPUTS.md`](GOLDEN_OUTPUTS.md) for the actual text.
- **That fallback content violates the product's own non-negotiable rules.** Timeline entries
  read "Pivotal era in {year}" and "{Topic} underwent core changes and reached major
  development" — the exact generic phrasing `CLAUDE.md` forbids. Chapter reader questions
  read "What represents the starting motivation behind Causes?" — the literal malformed
  example `CLAUDE.md` cites as *bad*. Structured fact fields read "Compiled detail for
  {field}" verbatim.
- **The linter did not catch any of it**, because its placeholder and generic-wording checks
  are substring matches against a specific known-bad list, not semantic checks. See
  [`DECISIONS.md`](DECISIONS.md) for the itemized gaps.
- **Fourteen of 21 components and roughly a dozen `lib/editorial/*` modules are dead code**
  from earlier product iterations (V13's editorial engine, V14.5's first results-page
  redesign) that were superseded but never removed. They add maintenance surface without
  adding functionality.
- **Related topics and "read more" links are not guaranteed to be related.** In fallback
  mode they are assigned positionally from the raw set of Wikipedia links near the source
  article, with no relevance filter.
- **Single-image dependency.** The only visual asset is the Wikipedia lead thumbnail, reused
  across the hero, the carousel side panel, and (when present) discovery cards.
- **A numeric "surprise score" is shown directly in the UI** (`FactCards.tsx`:
  `Surprise: {item.surpriseScore}/10`), which `CLAUDE.md` explicitly says not to do unless
  the score is properly calibrated. It is not currently calibrated — it is either an LLM
  guess (1–10) or, in fallback mode, `10 - array index`.

## Future Direction

Two "Future" ambitions are already on record in `docs/API.md` and are still unbuilt:
Wikidata integration, Wikimedia Commons images, and a maps/OpenStreetMap module for
geography-heavy ontologies (Country, Historical Event).

Beyond that, the priority implied by the current state of the repo is **editorial
reliability before UI expansion** (also stated directly in `CLAUDE.md`): close the gap
between what the linter can currently detect and what the product's own rules require,
regenerate the canonical cache once that gate is trustworthy, and only then invest further
in new UI surface. See [`ROADMAP.md`](ROADMAP.md) for the versioned plan.
