# Prompts

Reusable prompts for future Claude sessions on this repo. Each is self-contained — paste it
directly into a new session. They reference real files and findings from
[`ARCHITECTURE.md`](ARCHITECTURE.md), [`DECISIONS.md`](DECISIONS.md), and
[`BENCHMARKS.md`](BENCHMARKS.md) so they don't require re-deriving context.

---

## Audit Prompts

### Re-audit the canonical cache
```
Check every file under knowledge/*/*.json for the fallback-content signatures documented in
docs/BENCHMARKS.md: the literal string "Compiled detail for", the timeline headline pattern
"Pivotal era in", and reader questions matching "What represents the starting motivation
behind". Report which artifacts still contain them and which have been regenerated with real
LLM output. Do not edit any files — this is a read-only audit.
```

### Verify GEMINI_API_KEY is actually working end-to-end
```
docs/DECISIONS.md notes that .env.local has a GEMINI_API_KEY set, yet every committed
artifact under knowledge/ is fallback-authored. Investigate why: run a single topic (e.g.
"Test Topic That Won't Be Cached") through the pipeline in dev, add temporary logging to
src/lib/knowledge/compiler.ts's catch block, and determine whether Gemini calls are failing
(bad key, quota, model name issue) or whether these artifacts simply predate the key being
added. Report findings; do not fix anything yet.
```

### Find newly-introduced dead code
```
docs/ARCHITECTURE.md lists the components and lib/editorial modules that were dead as of this
audit. Re-run the same check — grep every file in src/components and src/lib/editorial for
import references from src/app — and report any new orphans introduced since, or confirm the
list is unchanged.
```

---

## Refactor Prompts

### Remove confirmed dead code
```
docs/DECISIONS.md and docs/ARCHITECTURE.md list ~27 files with zero import references:
13 files in src/lib/editorial/ (classifier.ts, entityClassifier.ts, extractor.ts,
factAssignment.ts, facts.ts, factsCurator.ts, perspectives.ts, planner.ts, planner/*.ts x8,
retry.ts, summary.ts, timeline.ts), src/lib/knowledge/geminiWriter.ts plus its sole consumer
src/lib/editorial/validator.ts, and 14 files in src/components/ (AISummary.tsx, ArticleCard.tsx,
Carousel.tsx, EmptyState.tsx, HeroImage.tsx, KnowledgeGraph.tsx, Loading.tsx,
PeopleAlsoExplored.tsx, PerspectiveGrid.tsx, RelatedArticles.tsx, RelatedJourney.tsx,
Timeline.tsx, TimelineCard.tsx, VisualModules.tsx). Confirm each still has zero references
with a fresh grep, then delete them in a single PR. Run npm run lint && npx tsc --noEmit &&
npm run build afterward to confirm nothing regressed.
```

### Centralize the model name
```
The string "gemini-2.0-flash" is hardcoded across at least 8 files in src/lib/knowledge/ and
src/lib/editorial/. Extract it into a single exported constant (e.g. in
src/lib/knowledge/store.ts alongside COMPILER_VERSION) and replace every literal usage.
```

### De-duplicate the featured-topics list
```
app/page.tsx's `suggestions` array and SearchBar.tsx's `TRENDING_TOPICS` array both hardcode
the same six topics (Space Race, Roman Empire, Napoleon Bonaparte, Quantum Computing,
Renaissance Art, Taj Mahal) in different orders. Extract one shared source (with per-topic
description/emoji metadata for the homepage and the plain string list for the search bar) and
have both components import it.
```

---

## UI Prompts

### Fix the surprise-score UI violation
```
CLAUDE.md prohibits exposing an uncalibrated numeric surprise score in the UI. FactCards.tsx
currently renders "Surprise: {item.surpriseScore}/10" directly (both in the grid card and the
expansion modal). Either remove the numeric display in favor of a qualitative treatment (e.g.
an icon/label tier already partially present via the ICONS/LABELS arrays), or implement and
document a real calibration methodology before showing the number. Follow the existing
dark/cyan/glass visual language in docs/UI_GUIDELINES.md — no new colors, no drop shadows.
```

### Design a decision for KnowledgeGraph.tsx
```
src/components/KnowledgeGraph.tsx is a fully-built React Flow node-graph visualization with
zero current callers — orphaned from the V14.5 results-page redesign. Evaluate whether it's
worth reviving as a visible "knowledge graph" module on the results page (the pipeline already
produces GraphTriple[] data that could feed it) or should be formally deleted. If reviving,
restyle it to match the current documentary-carousel visual language in docs/UI_GUIDELINES.md
first — its existing styling predates the current design system.
```

---

## Knowledge Prompts

### Extend the linter's placeholder detection
```
src/lib/knowledge/linter.ts's no_placeholder_wording check only matches the literal words
"placeholder"/"tbd"/"n/a". It misses the fallback compiler's actual placeholder pattern,
"Compiled detail for {field}" (from getFallbackCompilation in src/lib/knowledge/compiler.ts).
Add a regex or pattern check for "Compiled detail for" (and any structurally similar
fallback-only phrasing you find while reading compiler.ts, factScript.ts,
narrativePlanner.ts, and documentaryWriter.ts's fallback functions) to the linter. Add a
regression test/fixture using the real knowledge/historical_event/space-race.json content as
a known-bad example that must fail the new check.
```

### Extend the linter's timeline-placeholder detection
```
src/lib/knowledge/linter.ts's no_timeline_milestone_placeholder check only matches the
substring "significant milestone". It misses the fallback timeline's actual text pattern,
"Pivotal era in {year}" and "underwent core changes and reached major development" (from
getFallbackCompilation in src/lib/knowledge/compiler.ts) — both of which are explicitly
banned generic timeline labels per CLAUDE.md. Extend the check accordingly and verify against
the real committed artifacts in knowledge/ (all 16 currently contain this pattern).
```

### Add a readerQuestion quality check to the linter
```
docs/BENCHMARKS.md documents that src/lib/knowledge/linter.ts never scans the
narrativePlan.chapters[].readerQuestion field (or the equivalent field on structuredFacts.cards)
against BANNED_AI_WORDS_PHRASES or for basic well-formedness. As a result, the fallback
narrative planner's "What represents the starting motivation behind {chapterTitle}?" — the
literal bad-example sentence in CLAUDE.md — currently passes validation. Add a check that (a)
scans readerQuestion against the existing banned-phrase list, and (b) rejects the specific
malformed pattern "What represents the starting motivation behind X" (and structurally similar
non-questions) from src/lib/knowledge/narrativePlanner.ts's getFallbackPlan.
```

### Add a knowledge-graph meaningfulness check
```
The fallback graph builder (getFallbackGraph in src/lib/knowledge/knowledgeGraph.ts) pads
short graphs with synthetic "{title} HAS_PROPERTY Detail_Aspect_N" triples, which trivially
pass the linter's graph_connected check because the subject is always the topic title. Add a
check that rejects triples using the literal predicate "HAS_PROPERTY" combined with an object
matching /^Detail_Aspect_\d+$/, and consider requiring a minimum number of triples with a
non-placeholder predicate.
```

### Regenerate the canonical cache
```
Once the linter fixes above have landed and GEMINI_API_KEY is confirmed working end-to-end
(see the Audit Prompts section), delete or regenerate all 16 artifacts under knowledge/ so the
committed cache reflects real LLM-authored documentaries rather than the current fallback
content. Spot-check the six topics in docs/GOLDEN_OUTPUTS.md against the "What good looks
like" criteria in that doc before committing.
```

---

## Release Prompts

### Pre-release editorial gate
```
Before tagging a new release, run npx tsx scripts/run-benchmarks.ts with a confirmed-working
GEMINI_API_KEY and manually spot-check the six topics in docs/GOLDEN_OUTPUTS.md against their
"What good looks like" criteria — do not rely on lintArtifact()'s passed:true alone, since
docs/BENCHMARKS.md documents specific known gaps between what the linter checks and what
CLAUDE.md actually requires. Update docs/GOLDEN_OUTPUTS.md's "What Failure Looks Like"
sections if any of the quoted broken examples have since been fixed.
```

### Release notes cross-check
```
Compare the current diff against docs/DECISIONS.md's technical debt list and docs/ROADMAP.md's
current version section. For each item resolved in this release, move it from "Technical
Debt"/the current roadmap version into a new dated entry in docs/DECISIONS.md's decision log,
and update docs/ROADMAP.md to reflect what's now shipped versus what's still pending.
```
