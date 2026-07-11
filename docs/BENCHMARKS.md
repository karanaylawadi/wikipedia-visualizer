# Benchmarks

## The Benchmark System

`scripts/run-benchmarks.ts` is the only automated quality gate in the repo. It:

1. Loads `.env.local` manually (`loadEnvLocal()`) and **exits 1 immediately if
   `GEMINI_API_KEY` is not set** — the script itself refuses to run without a key.
2. Runs 16 fixed topics through the exact same pipeline the app uses
   (`getArticleIntelligence`/`searchWikipedia` → `processKnowledgeDAG`), then calls
   `lintArtifact()` on the result.
3. For each topic, checks two things: does `artifact.ontology.name` match the
   `expectedOntology`, and did `lintArtifact()` return `passed: true`.
4. Prints per-topic pass/fail plus five named "V16 Documentary Metrics" (sentence
   provenance, fact density, generic wording, alternating pattern, documentary score).
5. Exits 1 if any topic failed either check — CI-gateable in principle.

### Benchmark Topics

The 16 topics hardcoded in `BENCHMARK_TOPICS` (`scripts/run-benchmarks.ts:27-44`), two per
ontology:

| Ontology | Topics |
|---|---|
| Movie | Inception, Interstellar |
| Person | Albert Einstein, Christopher Nolan |
| Company | Apple Inc., NVIDIA |
| Country | Japan, United Arab Emirates |
| Historical Event | World War II, Space Race |
| Art Movement | Renaissance, Mona Lisa |
| Technology | Python (programming language), Kubernetes |
| Science | DNA, Photosynthesis |

Note: this is a **different, larger set** than the six topics in
[`GOLDEN_OUTPUTS.md`](GOLDEN_OUTPUTS.md) (which adds Renaissance *Art* and Napoleon
Bonaparte — the latter is not in this automated suite at all; see that doc for the coverage
gap this creates).

## Scoring

Two layers:

1. **`lintArtifact()` boolean rules** (`src/lib/knowledge/linter.ts`) — ~27 named checks,
   each registered as either a hard `errors` entry (fails the artifact) or a `warnings` entry
   (soft). `passed = errors.length === 0`.
2. **`documentaryScore`** — starts at 100, loses points per violation class (generic wording
   −15, provenance −15, abstract writing −15, alternating-pattern violation −15, fact-density
   −10, curiosity −10, paragraph-too-long −10, generic title −10, missing concrete
   nouns/dates −10, repeated phrases −5, timeline placeholder −5, Did-You-Know too long −5).
   Gated at `>= 80` via the `documentary_score_ok` rule, which itself becomes one of the
   `errors` entries if it fails.

## Current Blind Spots

These are not theoretical — every one is demonstrated by the artifacts actually committed
under `knowledge/` today:

- **Placeholder detection is a substring match, not a semantic check.** It looks for the
  literal word "placeholder"/"tbd"/"n/a." It does not catch `"Compiled detail for {field}"`
  — the fallback compiler's real placeholder text — because that string doesn't contain any
  of the banned words.
- **Timeline placeholder detection only matches "significant milestone."** It does not catch
  `"Pivotal era in {year}"` or `"underwent core changes and reached major development"` — the
  fallback timeline's actual text, and the *literal examples `CLAUDE.md` names as banned.*
- **Knowledge-graph connectivity is checked by name-membership, not meaning.** The fallback
  graph's synthetic `HAS_PROPERTY → Detail_Aspect_N` triples always use the topic title as
  subject, so `graph_connected` (`entityNames.has(subject) || entityNames.has(object)`)
  passes trivially even though the triples carry zero information.
- **`readerQuestion` is never scanned for banned phrases at all.** Only `briefSummary` and
  card `summary` text are checked against `BANNED_AI_WORDS_PHRASES`. The fallback narrative
  planner's `"What represents the starting motivation behind {chapterTitle}?"` — the exact
  malformed-question example `CLAUDE.md` calls out — passes cleanly every time.
- **No relevance check on `relatedTopics` / `readMoreTopic`.** The benchmark never asks
  "is this actually related to the topic," only "does the field exist and is it under the
  count limit."
- **No qualitative/snapshot comparison at all.** The script only re-runs `lintArtifact()`;
  there is no golden-file diff, no LLM-as-judge pass, no human spot check built into CI. A
  regression that produces fluent-but-wrong prose, or reintroduces a banned phrase the linter
  doesn't yet know about, would not be caught.
- **The gate requires a working API key to run, but the pipeline can silently fall back
  per-stage even when a key is present** (rate limits, malformed JSON from the model,
  transient errors — every stage's `try/catch` swallows these). The benchmark script has no
  way to detect "this artifact was actually built from fallback templates, not the LLM,"
  because it only inspects the final `lintArtifact()` verdict, and that verdict doesn't
  distinguish the two paths either.

## Why V17 "Passes" Despite Poor UX

Walking the actual causal chain, using the committed evidence:

1. V17 added more linter rules and a numeric `documentaryScore`. On its face this reads as
   more rigorous quality control.
2. Every one of those new rules is still a regex/substring check against a specific,
   enumerated list of known-bad patterns (banned words, "significant milestone," six-sentence
   count, etc.) — not a semantic evaluation of whether the text is actually good.
3. The fallback generators in every pipeline stage were written independently of the linter's
   rule list, and happen to dodge nearly every specific pattern the linter checks for, while
   still being exactly the kind of generic, robotic, placeholder-laden text `CLAUDE.md`
   prohibits in spirit.
4. The proof is sitting in the repository: **all 16 committed `knowledge/*.json`
   artifacts** — including Space Race, Inception, Japan, and Photosynthesis, four of the six
   [`GOLDEN_OUTPUTS.md`](GOLDEN_OUTPUTS.md) topics — **report `"validationStatus": {
   "passed": true }` with every one of the ~27 rules marked `true`**, while containing:
   - `"causes": "Compiled detail for causes"` and five more identical placeholder fields, in
     `knowledge/historical_event/space-race.json`.
   - `"headline": "Pivotal era in 1957"` / `"description": "Space Race underwent core
     changes and reached major development in the year 1957"` — the timeline, for every
     entry.
   - `"readerQuestion": "What represents the starting motivation behind Causes?"` — the exact
     bad-example sentence from `CLAUDE.md`, generated by the app itself, verbatim, and
     shipped to the canonical cache.
   - `knowledgeGraph` triples reading `Space Race HAS_PROPERTY Detail_Aspect_1` through `_8`.
   - `relatedTopics` including "1948 Arab–Israeli War" and "1948 Czechoslovak coup d'état" —
     Wikipedia articles with no evident connection to the Space Race.

So "V17 passes" is true in the narrowest sense (the benchmark script exits 0 when the linter
says so) and false in every sense that matters to a reader: the committed, cached, currently-
servable output for the flagship benchmark topics is generic filler wearing a `passed: true`
badge.

## Improvements Required

In priority order (mirrors [`ROADMAP.md`](ROADMAP.md) V17.1):

1. Semantic placeholder and timeline-placeholder detectors, not substring lists.
2. A graph-triple meaningfulness check (reject `HAS_PROPERTY`/`Detail_Aspect_N`-style filler).
3. Extend banned-phrase scanning to `readerQuestion` (and ideally every string field on the
   artifact, via the existing `traverse()` helper already used for placeholder detection).
4. A relevance check on `relatedTopics`/`readMoreTopic` against the source topic.
5. A cache quality gate independent of the dependency-hash version check, so a fallback-
   authored artifact can't silently become "canonical" just because no one bumped
   `COMPILER_VERSION`.
6. Ideally, an LLM-as-judge or human spot-check step before an artifact is written to
   `knowledge/`, not just a rule-based linter after the fact.
7. Regenerate all 16 committed artifacts once `GEMINI_API_KEY` is confirmed live end-to-end,
   and add a benchmark assertion that fails loudly if any artifact was built via a fallback
   path (this requires the DAG to record which path produced each field — it currently
   doesn't).
