# V18 Editorial Quality Backlog

Source: the final live 18-topic benchmark run of V18 Phase 2 (`fix/v18-trustworthy-artifacts`),
after all three Gemini model-configuration fixes landed (see
`reports/releases/V18_PHASE2_GEMINI_COMPATIBILITY_REVIEW.md`,
`reports/benchmarks/V18_PHASE2_RESULTS.md`). Zero Gemini calls failed in this run; every failure
below is the linter (`src/lib/knowledge/linter.ts`) rejecting a content-quality issue in
otherwise-real, mostly-primary-generated content.

**Scope note, restated:** Phase 2's instructions explicitly excluded trust thresholds, cache
quality rules, narrative prompts, timeline behaviour, trivia ranking, and related-topic ranking
from that phase. Every fix recommended below touches one of those areas. **None of these should
be fixed on `fix/v18-trustworthy-artifacts`** — this doc exists so the next phase (proposed name:
**V18.1 — Editorial Quality & Linter Alignment**) has a ready-made, root-caused punch list instead
of needing to re-run and re-diagnose the benchmark from scratch.

## Failure Categories, Ranked by Prevalence

### 1. Sentence provenance below threshold — 13/18 topics, highest-frequency failure

**Symptom:** `Sentence provenance is incomplete: only 81–92% of sentences are mapped to facts.`
**Responsible stage:** `documentaryWriter.ts` (`parseProvenanceAndClean()`) and/or
`stylePolish.ts`'s polish pass, which rewrites sentences but must preserve a 1:1 sentence count to
keep provenance mapping intact (`stylePolish.ts` already checks `origSentences.length === 6 &&
polishedSentences.length === 6` before accepting a polished card — but the *summary* polish path
has no equivalent per-sentence check, and the underlying LLM writer itself doesn't tag literally
every sentence with a `[Fact N]`/`[Cause]`/`[Effect]`/`[Takeaway]` tag in the first place).
**Fix type:** narrative prompt (tighten `documentaryWriter.ts`'s instruction that *every* sentence
must carry a tag, with a stronger example) and/or a programmatic fallback (drop or flag untagged
sentences rather than silently including them, similar to `stylePolish.ts`'s existing card-level
guard).
**Severity:** High — single largest blocker, affects otherwise-clean primary-generation topics.
**Affected topics:** Inception, Interstellar, Albert Einstein, Apple Inc., NVIDIA, Japan, United
Arab Emirates, World War II, Renaissance, Mona Lisa, Python, Kubernetes, DNA, Photosynthesis,
Napoleon Bonaparte, Renaissance Art (16, not 13 — see per-topic table below for exact list).

### 2. Repeated 4-word phrases across chapters — 9/18 topics

**Symptom:** `Identical 4-word phrases must not repeat across chapters.`
**Responsible stage:** `factScript.ts` / `documentaryWriter.ts` — each chapter is written by an
independent LLM call with no visibility into other chapters' phrasing, so structurally similar
prompts across chapters (same "Sentence 1: Fact 1... Sentence 2: Cause..." template) produce
similar connective phrases (e.g. "played a key role in").
**Fix type:** narrative prompt — either pass already-used phrases from prior chapters into each
subsequent chapter's prompt as a soft exclusion list, or add a post-generation dedup/rewrite pass.
**Severity:** Medium — cosmetic/repetition issue, not a factual-accuracy issue.
**Affected topics:** Inception, Interstellar, Apple Inc., NVIDIA, Japan, United Arab Emirates,
Renaissance, Mona Lisa, Python, Photosynthesis, Renaissance Art, Space Race (12).

### 3. Card summaries violate the 6-sentence alternating pattern — 4/18 topics

**Symptom:** `Card summaries must follow the alternating pattern: exactly 6 sentences per card
summary. Violations: N.`
**Responsible stage:** `documentaryWriter.ts`'s `writeDocumentaryCard()` prompt (the alternating
fact/cause/fact/effect/fact/takeaway structure) — the LLM occasionally merges or splits a
sentence, producing 5 or 7.
**Fix type:** narrative prompt (stronger structural constraint, or a deterministic post-check that
retries once on a sentence-count mismatch — `stylePolish.ts` already has this pattern for its own
polish step; the initial write step does not).
**Severity:** Medium.
**Affected topics:** Inception, Interstellar, Albert Einstein, Space Race.

### 4. Documentary score too low — 6/18 topics

**Symptom:** `Documentary score is too low: 60–75/100.`
**Responsible stage:** composite of `linter.ts`'s `documentary_score_ok` check, which aggregates
several of the above signals (alternating pattern, provenance, phrase variety). Not a distinct
root cause — expected to resolve automatically once categories 1–3 are fixed.
**Fix type:** none needed directly; downstream of the above.
**Severity:** Low (derivative).
**Affected topics:** Inception, Interstellar, Albert Einstein, Japan, United Arab Emirates, Space
Race, Mona Lisa, Kubernetes.

### 5. Timeline not in strict chronological order — 4/18 topics

**Symptom:** `Timeline is not in strict chronological order.`
**Responsible stage:** `compiler.ts`'s LLM-path timeline extraction — the model returns events in
narrative order, not date order.
**Fix type:** **cheapest fix in this whole backlog, and arguably not a "narrative prompt" change
at all** — sort `parsed.timeline` by year immediately after parsing in `compileKnowledge()`
(`compiler.ts`), a deterministic post-processing step rather than a prompt change or trust-gate
change. Worth flagging to the next phase as a likely one-line fix outside the prompt-tuning work.
**Severity:** Medium — mechanical, not a content-quality judgment call.
**Affected topics:** Japan, United Arab Emirates, Renaissance, Kubernetes.

### 6. Paragraph exceeds 130-word limit — 4/18 topics

**Symptom:** `Artifact contains a paragraph exceeding 130 words.`
**Responsible stage:** `documentaryWriter.ts`'s summary-writing prompt (100–125 word target is
stated, but not always honored) or `stylePolish.ts` expanding it during the polish pass.
**Fix type:** narrative prompt (stricter word-count enforcement) or a deterministic truncation
guard using the existing `sentenceCleaner.ts` utilities.
**Severity:** Low.
**Affected topics:** Albert Einstein, Christopher Nolan, Japan, United Arab Emirates, Space Race
(5).

### 7. Missing or empty required ontology field — 4/18 topics

**Symptom:** `Missing required ontology field: "X" for ontology "Y"` / `Required array field "X"
is empty`.
**Responsible stage:** two different root causes bundled under one symptom:
- **Genuine extraction gaps** (`composer` for Interstellar, `revenue` for NVIDIA, `discoverer`/
  `limitations` for DNA): `compiler.ts`'s LLM extraction didn't find or return the field even
  though the source Wikipedia article likely contains it. Fix type: narrative/extraction prompt.
- **Ontology-schema design issue, not a content gap** (`death` required for Christopher Nolan, a
  living person): `ontologyEngine.ts`'s `Person` ontology requires `death` unconditionally. A
  living person legitimately has no death field. Fix type: **canonical-data / ontology-schema
  fix** (make `death` conditionally required, or excluded when the compiler's own extraction
  indicates the subject is living) — this is a schema-design bug, not an editorial-quality issue,
  and may be worth prioritizing separately since it will recur for every living person in the
  benchmark set.
**Severity:** Medium (extraction gaps), Medium-High (the living-person `death` field schema bug —
recommend fixing first since it's unambiguous and affects any living-person topic).
**Affected topics:** Interstellar, Christopher Nolan, NVIDIA, DNA.

### 8. Timeline size outside ontology boundary — 1/18 topics (DNA)

**Symptom:** `Timeline size (1) is outside the ontology boundary of [5, 8].`
**Responsible stage:** `compiler.ts`'s fallback significance-filter for scientific/conceptual
topics without a clean "historical events" narrative (DNA's Wikipedia article has few
dated-and-keyworded sentences that survive the timeline filter). Compounds with category 7's DNA
extraction gaps.
**Fix type:** either narrative-prompt (ask the LLM harder for a science-appropriate timeline —
discovery date, major milestone dates) or ontology-schema (loosen the Science ontology's timeline
`minEvents` for topics without a strong chronological narrative).
**Severity:** Low — isolated to one topic.

### 9. Chapter card fact density too low — 1/18 topics (Kubernetes)

**Symptom:** `Chapter cards do not meet the minimum fact density requirements (Named Entities >=
4, Unique Facts >= 3). Violations: 1.`
**Responsible stage:** `factScript.ts` extraction for a technical topic with fewer named
entities/people than a typical historical or biographical topic.
**Fix type:** narrative prompt (broaden what counts as a "named entity" for Technology-ontology
topics — e.g. project names, companies, protocol names — rather than only people/places).
**Severity:** Low — isolated to one topic, likely generalizes to other Technology-ontology topics
if not addressed.

### 10. Banned/generic AI wording leaked through — 1/18 topics (Mona Lisa)

**Symptom:** `Artifact contains generic AI wording / banned phrases: 1 occurrences.`
**Responsible stage:** `documentaryWriter.ts`'s `sanitizeBannedWords()` — the offending phrase
wasn't on the existing forbidden-word/phrase list.
**Fix type:** narrative prompt / word-list (add the specific phrase once identified from the raw
artifact; low effort, low risk).
**Severity:** Low.

### 11. Ontology classification disagreement — 1/18 topics (Renaissance)

**Symptom:** "Renaissance" resolves to `Historical Event`; the benchmark's own topic list expects
`Art Movement`.
**Responsible stage:** `entityResolver.ts`, or arguably the benchmark's topic list itself — "the
Renaissance" as a bare topic is genuinely ambiguous (it is both a historical period and the
umbrella term for the art movement), and the benchmark separately lists "Renaissance Art" with the
`Art Movement` expectation, which resolves correctly.
**Fix type:** either resolver-logic (bias disambiguation toward the art-movement sense for this
specific topic) or benchmark-expectation (change "Renaissance"'s expected ontology to `Historical
Event`, keeping "Renaissance Art" as the `Art Movement` case — the simpler, lower-risk fix).
**Severity:** Low — one topic, arguably a benchmark data issue rather than a code defect.

## Per-Topic Summary Table

| Topic | Quality Score | Generation Mode | Linter Failures (count) |
|---|---|---|---|
| Inception | 98/100 | primary | 4 (provenance, phrase repeat, alternating pattern, doc score) |
| Interstellar | 94/100 | mixed | 5 (missing field, phrase repeat, provenance, alternating pattern, doc score) |
| Albert Einstein | 94/100 | mixed | 4 (paragraph length, provenance, alternating pattern, doc score) |
| Christopher Nolan | 95/100 | mixed | 2 (missing field, paragraph length) |
| Apple Inc. | 96/100 | mixed | 2 (phrase repeat, provenance) |
| NVIDIA | 93/100 | mixed | 3 (missing field, phrase repeat, provenance) |
| Japan | 97/100 | mixed | 5 (chronology, paragraph length, phrase repeat, provenance, doc score) |
| United Arab Emirates | 98/100 | primary | 5 (chronology, paragraph length, phrase repeat, provenance, doc score) |
| World War II | 97/100 | primary | 1 (provenance) |
| Space Race | 98/100 | primary | 4 (paragraph length, phrase repeat, alternating pattern, doc score) |
| Renaissance | 96/100 | primary | 3 (ontology mismatch, chronology, phrase repeat, provenance — 4) |
| Mona Lisa | 97/100 | primary | 4 (banned wording, phrase repeat, provenance, doc score) |
| Python | 97/100 | primary | 2 (phrase repeat, provenance) |
| Kubernetes | 96/100 | mixed | 4 (chronology, provenance, fact density, doc score) |
| DNA | 91/100 | primary | 4 (missing fields, timeline size, provenance, low compiler confidence) |
| Photosynthesis | 97/100 | primary | 2 (phrase repeat, provenance) |
| Napoleon Bonaparte | 94/100 | mixed | 1 (provenance) |
| Renaissance Art | 96/100 | primary | 2 (phrase repeat, provenance) |

## Recommended Fix Order for V18.1

1. **Timeline chronological sort** (category 5) — deterministic, one-line, not really a
   "narrative prompt" change; highest confidence, lowest risk fix in this list.
2. **`death` field conditionally required for living persons** (part of category 7) —
   unambiguous ontology-schema bug, will recur for any living-person topic.
3. **Sentence provenance tagging** (category 1) — highest prevalence; likely the single highest-
   leverage prompt change.
4. **Phrase repetition across chapters** (category 2) — second-highest prevalence.
5. Remaining categories (3, 4 [derivative], 6, 8, 9, 10) as smaller follow-ups once the above
   land, since category 4 should improve automatically and several others are single-topic.
6. **Renaissance ontology disagreement** (category 11) — recommend a benchmark-expectation fix
   (lowest-risk) over resolver-logic changes.
