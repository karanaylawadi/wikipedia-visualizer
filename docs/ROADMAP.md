# Roadmap

Ordered by dependency, not by ambition. Per `CLAUDE.md`: no major UI redesign starts until
the content pipeline reliably produces correct, concise, relevant output for the benchmark
topics — so every version below prioritizes editorial reliability before new surface area.

## V17.1 — Close the gap between the linter and the rules it's supposed to enforce

The linter currently reports `passed: true` on content that violates `CLAUDE.md` outright.
Fix the specific detection gaps before doing anything else:

- Extend `no_placeholder_wording` (`src/lib/knowledge/linter.ts`) to catch the fallback
  compiler's actual placeholder pattern, `"Compiled detail for {field}"`, not just the
  literal word "placeholder."
- Extend `no_timeline_milestone_placeholder` to catch `"Pivotal era in {year}"` and
  `"underwent core changes and reached major development"`, not just the substring
  "significant milestone."
- Add a `readerQuestion` check to `BANNED_AI_WORDS_PHRASES` scanning (currently only
  `briefSummary` and card `summary` fields are checked).
- Add a graph-triple meaningfulness check that rejects synthetic
  `HAS_PROPERTY → Detail_Aspect_N` filler, so `graph_connected` can no longer pass on
  fallback-only graphs.
- Once the above land, re-run `scripts/run-benchmarks.ts` with a confirmed-working
  `GEMINI_API_KEY` and regenerate the 16 committed `knowledge/*.json` artifacts — every one
  is currently fallback-authored (see [`BENCHMARKS.md`](BENCHMARKS.md)).
- Fix or hide `FactCards.tsx`'s raw `Surprise: {score}/10` display per `CLAUDE.md`'s
  calibration rule.
- Remove the confirmed-dead files listed in
  [`ARCHITECTURE.md`](ARCHITECTURE.md#orphaned-code-not-part-of-the-live-architecture) and
  [`DECISIONS.md`](DECISIONS.md#technical-debt) (13 `lib/editorial/*` files,
  `knowledge/geminiWriter.ts` + `editorial/validator.ts`, 14 `src/components/*` files) —
  confirm with whoever owns the branch that none are mid-flight work first.

## V18 — Make "related" actually mean related

- Replace fallback related-topic assignment (currently positional from the raw Wikipedia
  link list) with a relevance-scored selection even when the LLM path is unavailable —
  `curateRelatedExploration()` in `src/lib/editorial/related.ts` already has a scoring
  formula; extend it to also gate the *input* list, not just re-rank it.
- Build real knowledge-graph enrichment (Wikidata-backed triples) as an alternative to the
  synthetic fallback graph, rather than accepting `HAS_PROPERTY → Detail_Aspect_N` filler as
  an acceptable minimum.
- De-duplicate the featured-topics list between `app/page.tsx` and `SearchBar.tsx` into one
  shared constant.
- Centralize the model name (`"gemini-2.0-flash"`, currently repeated in 8 files) into one
  config value.
- Add multi-image sourcing — today every visual surface (hero, carousel side panel,
  discovery cards) reuses the single Wikipedia lead thumbnail.

## V19 — External knowledge sources

Both items below are already-stated ambitions in `docs/API.md`'s "Future" section and remain
unbuilt:

- Wikidata integration for structured facts that don't require an LLM extraction pass at all
  (birth/death dates, population figures, founding dates — anything Wikidata already
  structures).
- Wikimedia Commons image sourcing, to move beyond the single lead thumbnail.
- A maps/geography module (OpenStreetMap) for Country and Historical Event ontologies,
  where `countryData.mapLocation` and `historyData.geography` currently render as plain text.
- A lightweight editorial review surface so a human can compare a newly generated artifact
  against the `CLAUDE.md` rule set before it's written to the canonical `knowledge/` store —
  closing the exact gap that let 16 fallback artifacts ship as "passed."

## Future

- Decide deliberately whether to reinstate the React Flow node-graph visualization
  (`KnowledgeGraph.tsx`, currently orphaned) as a real feature, or formally retire it instead
  of leaving it as dead code that looks like it might still be wired up.
- Surface the sentence-level fact provenance the pipeline already tracks
  (`briefSummaryProvenance`, per-card `provenance`) as a visible "sources" affordance for
  reader trust — it is currently computed and validated internally but never rendered.
- Revisit whether ontology classification should route through Wikidata's own instance-of/
  subclass-of claims instead of (or in addition to) LLM classification, now that entity
  resolution already fetches a `wikidataId` for every topic but doesn't yet use it for
  anything beyond storage.
