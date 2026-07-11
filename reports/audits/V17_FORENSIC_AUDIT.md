# V17 Forensic Audit

**Objective:** understand exactly why mediocre content reaches the UI despite passing
validation. This is an investigation, not a fix. No code was modified to produce this
report — every claim below is either a direct quote from a committed file (code or cached
JSON) or an inference explicitly marked as such.

**Method:** three complete topics — Space Race (`knowledge/historical_event/space-race.json`),
Inception (`knowledge/movie/inception.json`), Japan (`knowledge/country/japan.json`) — traced
through all fifteen pipeline stages, from the raw Wikipedia fetch to the exact pixels a reader
sees. Every sentence visible in the UI for these three topics is accounted for below with its
origin and provenance chain.

**Headline finding, stated up front because it reframes everything else in this report:**
all three topics were compiled entirely through fallback/deterministic-template code paths,
not through Gemini. This is provable without access to logs or the live key, from static
evidence alone:

- The resolver confidence for all three topics is exactly `0.96` — the literal hardcoded
  value `runHeuristicClassification()` returns (`src/lib/knowledge/entityResolver.ts:208`),
  not a value an LLM would independently produce three times in a row.
- Every structured-fact field for all three topics reads `"Compiled detail for {field}"` or
  `["Significant Item 1", "Significant Item 2"]` — the literal fallback templates in
  `getFallbackCompilation()` (`src/lib/knowledge/compiler.ts:121-127`).
- Every card summary across all three topics follows the identical five-template sentence
  pattern from `getFallbackCard()` (`src/lib/knowledge/documentaryWriter.ts:348-393`),
  varying only by which of the five `cardIndex` branches applies.
- `.env.local` contains a `GEMINI_API_KEY`. Its presence does not contradict this finding —
  every call site in the DAG independently falls back on *any* failure (timeout, quota,
  malformed JSON, rate limit), and nothing distinguishes "no key" from "key present but every
  call failed." See Bug #3 in the Top 20 list.

Every stage description below therefore documents the **fallback/deterministic path actually
exercised**, not the LLM path the code is designed to prefer. Where the LLM path would differ,
this is noted explicitly.

---

## Topic 1: Space Race

**Ontology:** Historical Event. **Source artifact:**
`knowledge/historical_event/space-race.json`. **`validationStatus.passed`:** `true`.

### Stage-by-Stage Trace

| Stage | Input | Output | File | Function | Det. / LLM | Confidence | Known Weaknesses |
|---|---|---|---|---|---|---|---|
| 1. Wikipedia Retrieval | Query string `"Space Race"` | `ArticleIntelligence` (extract, lead, links, categories, thumbnail) | `src/lib/editorial/wikipedia.ts` | `getArticleIntelligence()` | Deterministic | N/A (raw fetch) | Duplicate fetch — `entityResolver.ts` independently re-fetches the same page's metadata via its own `fetchWikiMetadata()` call (Bug #19). |
| 2. Entity Resolution | `"Space Race"` | `{entityType: "Historical Event", confidence: 0.96, canonicalTitle: "Space Race"}` | `src/lib/knowledge/entityResolver.ts` | `resolveEntity()` → `runHeuristicClassification()` | Deterministic fallback (LLM path unused) | **0.96, hardcoded literal** (line 208 comment: *"Heuristic default is high enough to bypass pass 2 retry"*) | Confidence is invented to deliberately skip the one verification step that exists (Bug #4). Matched via `t.includes("space race")` direct-title heuristic. |
| 3. Ontology Classification | `entityType: "Historical Event"` | `ONTOLOGY_DEFINITIONS["Historical Event"]` (Causes→Early Battles→Turning Point→Outcome→Legacy blueprint) | `src/lib/ontology/ontologyEngine.ts` | `mapEntityTypeToOntology()` | Deterministic (pure lookup) | N/A | None found — this layer is a clean data-driven map and behaved correctly. |
| 4. Canonical Knowledge | Wikipedia extract (~2,800 chars) | `structuredFacts: {causes: "Compiled detail for causes", turningPoints: "Compiled detail for turningPoints", ...}`, 6 timeline entries, 10 trivia candidates, 8 related topics | `src/lib/knowledge/compiler.ts` | `compileKnowledge()` → `getFallbackCompilation()` | Deterministic fallback | N/A | Every required field is the literal placeholder string. Timeline built from `extract.match(/\b(1\d{3}\|2\d{3})\b/g)` with zero significance filter. `relatedTopics: article.links.slice(0,8)` — raw, unfiltered. |
| 5. Knowledge Graph | `structuredFacts` (all placeholder) | 8 triples, all `Space Race HAS_PROPERTY Detail_Aspect_N` | `src/lib/knowledge/knowledgeGraph.ts` | `buildKnowledgeGraph()` → `getFallbackGraph()` | Deterministic fallback | N/A | Historical Event ontology has no direct field→triple mapping in `getFallbackGraph()`'s switch (only Movie/Person/Company/Country/Technology/Science branches exist), so it falls straight to the `Detail_Aspect_N` padding loop for all 8 triples — zero real relationship data. |
| 6. Fact Ranking | 10 candidate facts (trivia + source-section bullets) | 10 `EvaluatedFact` objects, scores 0.7–0.85 | `src/lib/knowledge/factEvaluator.ts` | `evaluateFacts()` → `getFallbackEvaluation()` | Deterministic fallback | Score is `isFactWeak ? 0.5 : (specificity===0.9 ? 0.85 : 0.7)` — a two-branch heuristic, not an assessment | Presented as a 7-metric evaluation (`confidence`, `specificity`, `narrativeValue`...) but 6 of 7 metrics are hardcoded constants (`confidence: 0.95, narrativeValue: 0.8, educationalValue: 0.8, visualValue: 0.7, uniqueness: 0.7, ontologyRelevance: 0.85` — identical for every fact, every topic). |
| 7. Narrative Planning | Ontology blueprint (5 chapters) + ranked facts | 5 chapters, each with a title, `readerQuestion` from a fixed template array, 2 `approvedFacts` | `src/lib/knowledge/narrativePlanner.ts` | `planNarrative()` → `getFallbackPlan()` | Deterministic fallback | N/A | `readerQuestion` chosen by chapter *index* from a fixed 5-question array with no topic/ontology awareness — chapter 0's question is literally `"What represents the starting motivation behind Causes?"`, the exact malformed example `CLAUDE.md` names as bad (Bug #6). |
| 8. Fact Script | Chapter plan + `approvedFacts` | Per-chapter `cause`/`effect`/`takeaway` strings from a fixed template, `keyFacts` = the 2 approved facts verbatim | `src/lib/knowledge/factScript.ts` | `generateFactScript()` → `getFallbackChapterScript()` | Deterministic fallback | N/A | `cause`/`effect`/`takeaway` are index-selected templates (e.g. `"motivating factors behind early phases of development"`), themselves on `CLAUDE.md`'s banned-phrase list. This stage otherwise correctly preserved the two real facts per chapter. |
| 9. Documentary Writer | Fact script chapters | `briefSummary` (4 sentences) + 5 chapter cards (6 sentences each, exactly) | `src/lib/knowledge/documentaryWriter.ts` | `writeDocumentarySummary()`/`writeDocumentaryCard()` → `getFallbackSummary()`/`getFallbackCard()` | Deterministic fallback | N/A | `cleanFact()` truncates every fact/cause/effect/takeaway to 11 words mid-sentence (Bug #5). `referenceLabel: chapterTitle.split(" ")[0]` produces the label `"The"` for 3 of 5 cards (Causes, Turning Point, Outcome, Legacy chapter titles all start with "The") — a bug present in the LLM-success code path too, not fallback-specific (Bug #8). |
| 10. Style Polish | `briefSummary` + 5 cards | Unchanged (no-op) | `src/lib/knowledge/stylePolish.ts` | `polishDocumentary()` | No-ops when `GEMINI_API_KEY` absent from this call's perspective, but here the key exists and the call still produced no visible change — consistent with the umbrella finding that this call also failed and fell through to `return { summary, cards }` unchanged | N/A | Contributes nothing when its LLM call fails; there is no fallback template for this stage (correctly — there's nothing to "polish" deterministically), but also no signal that it silently did nothing. |
| 11. Validation | Full artifact payload | `LintReport {passed: true, errors: [], warnings: ["Timeline is not in strict chronological order"... — not present for Space Race, see note]}` | `src/lib/knowledge/linter.ts` | `lintArtifact()` | Deterministic (~27 rule checks) | N/A | All 27 rules registered `true` except none flagged for Space Race specifically (its timeline years happen to already be ascending: 1951→1972). Every gap in Bugs #9, #12–#18 applies. |
| 12. Cache | Validated artifact, `lintReport.passed: true` | `knowledge/historical_event/space-race.json` written to disk | `src/lib/knowledge/store.ts` | `saveLocalArtifact()` | Deterministic | N/A | No quality gate beyond `lintReport.passed`. Written under `COMPILER_VERSION: "v17.0"` — will be served unchanged until that version or the dependency hash changes. |
| 13. API | `POST /api/analyze {topic: "Space Race"}` | JSON response: `article`, `shortSummary`, `resultCards`, `didYouKnow` (top 5 of 10), `timeline`, `structuredFacts` (with `historyData` block attached), `seo`, `exploredTopics` | `src/app/api/analyze/route.ts` | `POST()` handler | Deterministic orchestration | N/A | `seo.metaDescription = shortSummary.slice(0, 155)` — the Google-search-visible description begins `"Space Race records confirm that The Space Race (Russian: космическая гонка..."` (Bug #16). `exploredTopics` computed via `curateRelatedExploration()` (Bug #10). |
| 14. Frontend | API JSON | Props passed to 6 components | `src/app/results/page.tsx` | `ResultsContent()` | Deterministic | N/A | No client-side quality check of any kind — renders whatever arrives on HTTP 200. |
| 15. Rendered UI | Component props | Final DOM | `EditorialCarousel`/`EditorialSlide`, `VisualSnapshot`, `FactCards`, `KnowledgeJourney`, `DiscoveryCarousel` | (render functions) | Deterministic | N/A | Nothing in the render path checks for placeholder text, truncated sentences, or malformed questions — every defect from stages 4–9 reaches the screen verbatim. |

### Sentence-Level Provenance — Space Race

| # | Sentence as shown in UI | First appeared at | Origin | Provenance chain | Notes |
|---|---|---|---|---|---|
| 1 | *"Space Race records verify that The Space Race (Russian: космическая гонка, romanized: kosmicheskaya gonka, IPA: [kɐsˈmʲitɕɪskəjə."* (Card 1, sentence 1) | Documentary Writer (`getFallbackCard`, cardIndex 0) | Fallback template + Wikipedia | Sentence → `cleanFact()`-truncated Fact 1 → `rankedFacts[0]` → Wikipedia lead paragraph → `en.wikipedia.org/wiki/Space_Race` | Truncation lands mid-IPA-transcription; not a sentence by any grammatical definition. |
| 2 | *"This motivated early research explaining why motivating factors behind early phases of development."* (Card 1, sentence 2) | Fact Script (`getFallbackChapterScript`, index 0) | **Template**, no Wikipedia content at all | Sentence → `[Cause]` field → hardcoded string in `factScript.ts:111` → UNKNOWN (no source article relationship) | Zero connection to the Space Race specifically; this exact string would appear for any topic's first chapter. |
| 3 | *"What represents the starting motivation behind Causes?"* (Card 1 reader question) | Narrative Planning (`getFallbackPlan`, index 0) | Template | Question → `fallbackQuestions[0]` → hardcoded string in `narrativePlanner.ts:87` → UNKNOWN | The literal `CLAUDE.md` bad-example sentence, generated by this exact function. |
| 4 | Timeline entry: *"Pivotal era in 1957"* / *"Space Race underwent core changes and reached major development in the year 1957"* | Canonical Knowledge (`getFallbackCompilation`) | Template wrapper around a real date | Description → hardcoded template string in `compiler.ts:135-136`; year `1957` → regex-extracted from Wikipedia extract (correctly — 1957 is Sputnik's real year) → `en.wikipedia.org/wiki/Space_Race` | The *year* is real and traceable; the *headline and description* are 100% template, discarding what the extract actually says happened in 1957 (Sputnik 1). |
| 5 | Related topic: *"1948 Arab–Israeli War"* | Canonical Knowledge (`getFallbackCompilation`) | Wikipedia (raw link list), zero relevance filter | Topic → `article.links.slice(0,8)` → Wikipedia's raw outbound link list on the Space Race page → `en.wikipedia.org/wiki/Space_Race` | Provenance to Wikipedia is real (it is a genuine outbound link), but provenance to *relevance* is **UNKNOWN** — no scoring or filtering exists on this path. |
| 6 | Knowledge graph triple: `Space Race HAS_PROPERTY Detail_Aspect_3` | Knowledge Graph (`getFallbackGraph`) | Template | Triple → padding loop in `knowledgeGraph.ts:110-117` → UNKNOWN | Carries zero information; `Detail_Aspect_3` is not derived from any fact. |

### Where Failure Classes First Appear — Space Race

- **Placeholder content** first appears at Stage 4 (Canonical Knowledge, `compiler.ts:121-127`), as `"Compiled detail for {field}"` in every one of `causes`/`timeline`/`participants`/`turningPoints`/`outcome`/`impact`.
- **Malformed questions** first appear at Stage 7 (Narrative Planning, `narrativePlanner.ts:87`).
- **Generic timelines** first appear at Stage 4 (Canonical Knowledge, `compiler.ts:130-141`).
- **Weak Did-You-Know facts**: not weak in content (Space Race's real trivia — the 1921 Gas Dynamics Laboratory, the V-2 lineage — is genuinely surprising) but weak in *presentation*: `surpriseScore` is `10 - index` (Stage 4, `compiler.ts`'s trivia mapping), not a real assessment.
- **Irrelevant Related Topics** first appear at Stage 4 (`compiler.ts:171`, raw link slice) and are *not corrected* at Stage 13 (API, `curateRelatedExploration()` — Bug #10 means its scoring can't fix this either).
- **Where hallucination becomes possible**: Stage 4 (Canonical Knowledge) is the only stage where an LLM (on the path this trace didn't exercise) would see the full, ~2,800-character raw Wikipedia extract and must extract/synthesize claims with no per-sentence provenance requirement — contrast Stage 9 (Documentary Writer), which is deliberately fed only pre-approved `FactScript` bullets and *is* provenance-tagged. Stage 4 is architecturally the weakest link against invention, even though this specific trace shows deterministic (non-hallucinating) fallback text instead.
- **Where validation should have rejected them**: Stage 11 (`lintArtifact()`) should have caught the placeholder text (misses it — substring check doesn't match "Compiled detail for"), the generic timeline (misses it — only matches "significant milestone"), the malformed question (never checks `readerQuestion` at all), and the meaningless graph (misses it — `graph_connected` passes on self-referential subjects). It caught none of these for Space Race, and the artifact reports `validationStatus.passed: true`.

---

## Topic 2: Inception

**Ontology:** Movie. **Source artifact:** `knowledge/movie/inception.json`.
**`validationStatus.passed`:** `true` (with one warning).

### Stage-by-Stage Trace

| Stage | Input | Output | File | Function | Det. / LLM | Confidence | Known Weaknesses |
|---|---|---|---|---|---|---|---|
| 1. Wikipedia Retrieval | `"Inception"` | `ArticleIntelligence` (~2,900-char extract covering plot + production + release) | `wikipedia.ts` | `getArticleIntelligence()` | Deterministic | N/A | Same duplicate-fetch issue as Space Race. |
| 2. Entity Resolution | `"Inception"` | `{entityType: "Movie", confidence: 0.96}` | `entityResolver.ts` | `runHeuristicClassification()` (matched `t.includes("inception")` direct-title branch) | Deterministic fallback | 0.96 hardcoded | Identical mechanism to Space Race — same hardcoded literal. |
| 3. Ontology Classification | `"Movie"` | Story→Production→Release→Reception→Legacy blueprint, required fields `director/cast/composer/themes/awards/reception/legacy` | `ontologyEngine.ts` | `mapEntityTypeToOntology()` | Deterministic | N/A | Correct classification; no defect. |
| 4. Canonical Knowledge | Wikipedia extract | `director: "Compiled detail for director"`, `cast: ["Significant Item 1", "Significant Item 2"]`, `composer: "Compiled detail for composer"`, `themes: [...]`, 6 timeline entries, 10 trivia | `compiler.ts` | `getFallbackCompilation()` | Deterministic fallback | N/A | **Array fields get a different placeholder shape than string fields** — `["Significant Item 1", "Significant Item 2"]` vs. `"Compiled detail for X"` (`compiler.ts:123` vs. `:125`). Neither is caught by the linter (Bug #9). For a Movie ontology, omitting the real director (Christopher Nolan) and composer (Hans Zimmer) — both present in the extract's lead paragraph — is a near-total information loss for the two facts a reader most wants. |
| 5. Knowledge Graph | `structuredFacts` (all placeholder) | 8 triples, **including `"Compiled detail for director" DIRECTED Inception`, `"Compiled detail for composer" COMPOSED Inception`, `"Significant Item 1" STARRED_IN Inception`, `"Significant Item 1" THEME_OF Inception`, `"Significant Item 2" STARRED_IN Inception`, `"Significant Item 2" THEME_OF Inception"` | `knowledgeGraph.ts` | `getFallbackGraph()` (Movie branch: `if (sf.director) triples.push({subject: sf.director, predicate: "DIRECTED", object: title})`) | Deterministic fallback | N/A | **The placeholder text propagates as if it were real data** — this is the sharpest defect found in this audit (Bug #2). The Movie branch of `getFallbackGraph()` correctly maps `director`→`DIRECTED`, `cast`→`STARRED_IN`, `themes`→`THEME_OF`, but never checks whether the value it's mapping is itself a placeholder string. |
| 6. Fact Ranking | 10 candidates (mostly the film's plot summary, sentence by sentence) | 10 `EvaluatedFact`s, top score 0.85 | `factEvaluator.ts` | `getFallbackEvaluation()` | Deterministic fallback | Top fact's specificity hit `0.9` (contains "2010") → score `0.85` | Same mechanism as Space Race; higher top score here purely because the first extracted fact happens to contain a 4-digit year. |
| 7. Narrative Planning | Movie blueprint + ranked facts | 5 chapters; chapter 2's ("Release") question is *"How do key chemical processes behave during Release?"* | `narrativePlanner.ts` | `getFallbackPlan()` | Deterministic fallback | N/A | Same fixed-by-index template array as Space Race — proof the array has zero ontology awareness: the *identical* "chemical processes" question template that appeared for Space Race's "Turning Point" chapter appears here for a film's "Release" chapter. |
| 8. Fact Script | Chapter plan | Per-chapter cause/effect/takeaway from the same fixed template; `keyFacts` = real plot-summary sentences (Cobb's team, the three dream levels, Limbo) preserved verbatim | `factScript.ts` | `getFallbackChapterScript()` | Deterministic fallback | N/A | This is the one stage where Inception's real content (plot specifics) survives relatively intact into `keyFacts`, because those come from `chapter.approvedFacts`, not a template. |
| 9. Documentary Writer | Fact script | `briefSummary`, 5 cards | `documentaryWriter.ts` | `getFallbackSummary()`/`getFallbackCard()` | Deterministic fallback | N/A | `cleanFact()` truncation cuts real plot detail mid-sentence: *"Later studies verified that Dom Cobb and Arthur are "extractors" who perform corporate espionage using."* — stops one word before "technology," the actual subject of the sentence. `referenceLabel` bug: 2 of 5 cards (Release, Legacy) get the label `"The"`. |
| 10. Style Polish | Summary + cards | Unchanged | `stylePolish.ts` | `polishDocumentary()` | Call failed silently, no visible effect | N/A | Same as Space Race. |
| 11. Validation | Full payload | `passed: true`, **one warning**: `"Timeline is not in strict chronological order"` | `linter.ts` | `lintArtifact()` | Deterministic | N/A | This is the **one rule in this entire audit that correctly detected a real defect** — Inception's timeline is `[2010, 2002, 2005, 2006, 2008, 2009]`, genuinely out of order. But `timeline_chronological` is registered as a warning (`registerCheck(..., true)` — the `isWarning` flag, `linter.ts:50`), not an error, so it cannot affect `passed` (Bug #18). |
| 12. Cache | Validated artifact | `knowledge/movie/inception.json` | `store.ts` | `saveLocalArtifact()` | Deterministic | N/A | Same mechanism as Space Race. |
| 13. API | `POST /api/analyze {topic: "Inception"}` | Response JSON with `movieData` block attached | `route.ts` | `POST()` | Deterministic | N/A | Same mechanism. `metaDescription` begins *"Inception records confirm that Inception is a 2010 science fiction action film written and directed..."* |
| 14. Frontend | API JSON | Props | `results/page.tsx` | `ResultsContent()` | Deterministic | N/A | Same. |
| 15. Rendered UI | Props | DOM | Same 5 live components | (render functions) | Deterministic | N/A | `VisualSnapshot`'s Movie tab would display `"Compiled detail for director"` verbatim wherever it renders `facts.movieData?.director` truthy-checked but not placeholder-checked (`VisualSnapshot.tsx`'s `creativeModule` `useMemo`, which reads `facts.movieData?.director` — not directly shown for director but the pattern is identical to `publisher`/`cast` fields in that same block). |

### Sentence-Level Provenance — Inception

| # | Sentence as shown in UI | First appeared at | Origin | Provenance chain | Notes |
|---|---|---|---|---|---|
| 1 | *"Inception records verify that Inception is a 2010 science fiction action film written and directed."* (Card 1, sentence 1) | Documentary Writer (`getFallbackCard`, index 0) | Fallback + Wikipedia | Sentence → truncated Fact 1 → `rankedFacts[0]` → Wikipedia lead → `en.wikipedia.org/wiki/Inception` | Truncated one clause before naming Christopher Nolan, who is present in the very next words of the source sentence. |
| 2 | Knowledge graph: `"Compiled detail for director" DIRECTED Inception` | Knowledge Graph (`getFallbackGraph`) | **Compounded template** — placeholder text from Stage 4 reused as a graph node | Triple → `sf.director` → `structuredFacts.director` → fallback template string (Stage 4) → UNKNOWN (the string has no Wikipedia origin at all — it names no one) | The most severe single defect traced in this report: a data-integrity error, not merely a display error — anything consuming this graph (search indexing, a revived `KnowledgeGraph.tsx`, a future Wikidata cross-reference) would ingest "Compiled detail for director" as a person's name. |
| 3 | *"Which factors influenced early discoveries of Production?"* (Card 2 reader question) | Narrative Planning (`getFallbackPlan`, index 1) | Template | Question → `fallbackQuestions[1]` → hardcoded string → UNKNOWN | Not as blatantly malformed as Card 1's question, but "early discoveries of Production" is not a coherent frame for a film's production chapter. |
| 4 | *"Dom Cobb and Arthur are "extractors" who perform corporate espionage using."* (Card 2, sentence 3, truncated) | Documentary Writer (`getFallbackCard`) | Fallback + Wikipedia | Sentence → truncated Fact 2 → `rankedFacts[3]` → Wikipedia plot summary → `en.wikipedia.org/wiki/Inception` | Real plot content, real provenance, destroyed by the 11-word truncation. |
| 5 | Timeline: *"Pivotal era in 2002"* | Canonical Knowledge | Template wrapper around a real, meaningfully-connected date | Year `2002` → regex-extracted → correctly corresponds to Nolan's completion of *Insomnia*, per the extract's own text → `en.wikipedia.org/wiki/Inception` | Unlike Japan's "2026" (below), this year genuinely matters to Inception's production history — the *year-extraction* worked correctly here; only the headline/description template discarded the substance. |
| 6 | Did You Know / read-more: *"12 Monkeys"* | Canonical Knowledge | Wikipedia raw link, unfiltered | Topic → `article.links[idx]` → raw outbound link → `en.wikipedia.org/wiki/Inception` | Coincidentally plausible (a genre-adjacent Terry Gilliam film) — this is luck of link-list position, not a working relevance filter; contrast Space Race's "1948 Arab–Israeli War" from the identical code path. |

### Where Failure Classes First Appear — Inception

- **Placeholder content**: Stage 4, two distinct shapes (`"Compiled detail for X"` and `["Significant Item 1", "Significant Item 2"]`) — the array shape is new relative to Space Race (Historical Event has no array-typed required fields) and confirms the placeholder problem is not one bug but a class of bugs across field types.
- **Malformed questions**: Stage 7, same mechanism, same file.
- **Generic timelines**: Stage 4, same mechanism, but here the *year* extraction is accidentally correct/meaningful (2002, 2005, 2006, 2008, 2009 all trace to real Nolan filmography dates in the extract) even though the headline/description text is still template filler.
- **Weak Did-You-Know facts**: same `10 - index` mechanism as Space Race.
- **Irrelevant Related Topics**: same raw-slice mechanism; happens to look better here by chance (12 Monkeys, 2001: A Space Odyssey — genuinely film-adjacent).
- **Where hallucination becomes possible**: same as Space Race — Stage 4's unconstrained, non-provenance-tracked extraction from ~2,900 characters of raw plot summary and production history is architecturally the weak point, even though this trace shows deterministic fallback, not invention.
- **New failure class found here, not present in Space Race's ontology**: **placeholder propagation into the knowledge graph** (Stage 5) is *worse* for Movie than for Historical Event, because Movie's `getFallbackGraph()` branch actively maps `sf.director`/`sf.composer`/`sf.cast` into subject positions — Historical Event has no such branch and falls straight to inert `Detail_Aspect_N` padding. A more fleshed-out per-ontology fallback graph builder produces *more* wrong information, not less, when its inputs are already placeholders.
- **Where validation should have rejected them**: everything Space Race's validation missed, plus: `no_placeholder_wording` should have caught `["Significant Item 1", "Significant Item 2"]` and didn't; no rule anywhere checks knowledge-graph triples for placeholder-derived subjects/objects (a `graph_connected`-adjacent rule that doesn't exist).

---

## Topic 3: Japan

**Ontology:** Country. **Source artifact:** `knowledge/country/japan.json`.
**`validationStatus.passed`:** `true` (with one warning).

### Stage-by-Stage Trace

| Stage | Input | Output | File | Function | Det. / LLM | Confidence | Known Weaknesses |
|---|---|---|---|---|---|---|---|
| 1. Wikipedia Retrieval | `"Japan"` | `ArticleIntelligence` (~3,000-char extract, geography/history/government/culture) | `wikipedia.ts` | `getArticleIntelligence()` | Deterministic | N/A | Same duplicate-fetch issue. |
| 2. Entity Resolution | `"Japan"` | `{entityType: "Country", confidence: 0.96}` | `entityResolver.ts` | `runHeuristicClassification()` (matched `t === "japan"` direct-title branch) | Deterministic fallback | 0.96 hardcoded | Identical mechanism. |
| 3. Ontology Classification | `"Country"` | Origins→History→Government→Culture→Modern Nation blueprint, required fields `government/geography/economy/culture/population/tourism` | `ontologyEngine.ts` | `mapEntityTypeToOntology()` | Deterministic | N/A | Correct; no defect. |
| 4. Canonical Knowledge | Wikipedia extract | All 6 required fields = `"Compiled detail for {field}"`; timeline's **first entry is year 2026** | `compiler.ts` | `getFallbackCompilation()` | Deterministic fallback | N/A | The extract's lead paragraph contains *"With a population of almost 123 million as of 2026"* — the regex `\b(1\d{3}\|2\d{3})\b` extracts `2026` as a "milestone year" with zero context awareness that it's a population-citation year, not a historical event date (Bug #7). For a Country ontology, `government: "Compiled detail for government"` directly violates that ontology's own stated validation rule ("Government system must be categorized, e.g. Republic, Monarchy") while `required_fields_exist` still reports `true`. |
| 5. Knowledge Graph | `structuredFacts` (all placeholder) | 8 triples: `Japan GOVERNED_AS "Compiled detail for government"` + 7× `Japan HAS_PROPERTY Detail_Aspect_N` | `knowledgeGraph.ts` | `getFallbackGraph()` (Country branch: `if (sf.government) triples.push({subject: title, predicate: "GOVERNED_AS", object: sf.government})`) | Deterministic fallback | N/A | Same propagation defect as Inception, direction reversed (placeholder lands in the *object* position here, not the *subject*) — the Country branch also checks `sf.capital` but Japan's `structuredFacts` has no `capital` field at all (`government/geography/economy/culture/population/tourism` — no `capital`), so only the one `GOVERNED_AS` triple is real-shaped (with placeholder content) and the rest is `Detail_Aspect_N` padding. |
| 6. Fact Ranking | 8 candidate facts | 8 `EvaluatedFact`s, top score 0.7 | `factEvaluator.ts` | `getFallbackEvaluation()` | Deterministic fallback | N/A | Same mechanism as the other two topics. |
| 7. Narrative Planning | Country blueprint + ranked facts | 5 chapters; **chapter 4 ("Modern Nation") has only ONE `approvedFact`, and it is itself a template string**: `"Concluding analysis confirms modern legacy values of Japan"` | `narrativePlanner.ts` | `getFallbackPlan()` | Deterministic fallback | N/A | `rankedFacts.slice(8, 10)` (chapter index 4, `start=8, end=10`) is empty because only 8 ranked facts exist total — the fallback then substitutes `fallbackFacts[4]`, a generic template with **zero connection to Japan or any real fact**. This is strictly worse than Space Race/Inception's chapters, which at least wrap *real* (if truncated) Wikipedia content. |
| 8. Fact Script | Chapter plan | Chapters 0–3 preserve real `keyFacts` (Meiji era, constitutional monarchy, the kanji 日本, the Taika Reforms); **chapter 4's `keyFacts` is the single template sentence from Stage 7, verbatim** | `factScript.ts` | `getFallbackChapterScript()` | Deterministic fallback | N/A | Chapter 4 is a total information void: the "Japan as a Modern Nation" chapter of the documentary is built from a sentence about nothing. |
| 9. Documentary Writer | Fact script | `briefSummary`, 5 cards | `documentaryWriter.ts` | `getFallbackSummary()`/`getFallbackCard()` | Deterministic fallback | N/A | `briefSummary` sentence 3: *"Japan records confirm that The name for Japan in Japanese is written using the kanji."* — `cleanFact()` truncates the source fact (*"...written using the kanji 日本 and is pronounced Nihon..."*) to exactly 11 words, which lands **immediately before the one substantive fact (日本) the sentence exists to convey** (Bug #5, worst observed instance). Card 5's ("Modern Nation") entire six-sentence paragraph is built from one contentless template fact, compounding Stage 7's defect. |
| 10. Style Polish | Summary + cards | Unchanged | `stylePolish.ts` | `polishDocumentary()` | Failed silently | N/A | Same as other topics. |
| 11. Validation | Full payload | `passed: true`, warning: `"Timeline is not in strict chronological order"` | `linter.ts` | `lintArtifact()` | Deterministic | N/A | Timeline is `[2026, 1600, 1853, 1868, 1889, 1895]` — correctly flagged as out of order (2026 first), but again only a warning. **No rule anywhere questions whether 2026 is a plausible "historical milestone" for a country's founding-era timeline** — chronological *ordering* is checked; chronological *plausibility* is not. |
| 12. Cache | Validated artifact | `knowledge/country/japan.json` | `store.ts` | `saveLocalArtifact()` | Deterministic | N/A | Same mechanism. |
| 13. API | `POST /api/analyze {topic: "Japan"}` | Response JSON with `countryData` block attached | `route.ts` | `POST()` | Deterministic | N/A | `metaDescription` begins *"Japan records confirm that Japan is an island country in East Asia Located in the..."* |
| 14. Frontend | API JSON | Props | `results/page.tsx` | `ResultsContent()` | Deterministic | N/A | Same. |
| 15. Rendered UI | Props | DOM | Same 5 live components | (render functions) | Deterministic | N/A | `VisualSnapshot`'s `countryModule` `useMemo` reads `facts.countryData?.capital \|\| facts.locations[0] \|\| "Capital administrative hub"` — since Japan's `structuredFacts` has no `capital` key at all (not even a placeholder), this specific field actually falls through to the more graceful `facts.locations[0]`/hardcoded-copy fallback *inside the component itself*, which is coincidentally better UX than rendering `"Compiled detail for capital"` would have been. This is luck of field-naming mismatch between the ontology's `requiredFields` (no `capital`) and `VisualSnapshot`'s expected shape (`countryData.capital`), not a designed safeguard. |

### Sentence-Level Provenance — Japan

| # | Sentence as shown in UI | First appeared at | Origin | Provenance chain | Notes |
|---|---|---|---|---|---|
| 1 | *"Japan records confirm that The name for Japan in Japanese is written using the kanji."* (brief summary, sentence 3) | Documentary Writer (`getFallbackSummary`) | Fallback + Wikipedia, truncated | Sentence → 11-word-truncated Fact → chapter 2 (`"Governing Japan"`) `keyFacts[0]` → Wikipedia extract → `en.wikipedia.org/wiki/Japan` | The single clearest example in this audit of truncation destroying the payload of a sentence: it ends at "kanji," one word before "日本." |
| 2 | Timeline: *"Pivotal era in 2026"* | Canonical Knowledge | Template wrapper around a **contextually wrong** date | Year `2026` → regex-extracted from *"population of almost 123 million as of 2026"* → `en.wikipedia.org/wiki/Japan` | Unlike Inception's 2002–2009 (accidentally meaningful), this year is extraction noise — a population-citation year misread as a historical milestone, for a country whose real founding-era history (Yamato unification, 4th–6th century; Tokugawa unification, 1600) is present in the same extract and *not* selected. |
| 3 | Card 5 ("Japan as a Modern Nation"), sentence 1: *"Verified sources show that Concluding analysis confirms modern legacy values of Japan."* | Documentary Writer, compounding Narrative Planning (Stage 7) | **Template wrapping a template — no Wikipedia content anywhere in this sentence's ancestry** | Sentence → Fact 1 → chapter 4 `keyFacts[0]` → chapter 4 `approvedFacts[0]` → `fallbackFacts[4]` (Stage 7 template, since `rankedFacts.slice(8,10)` was empty) → **UNKNOWN, no source article relationship** | The only sentence in this entire audit with **zero traceable connection to any Wikipedia source at any point in its chain** — every other example at least originates from a real (if truncated or misapplied) fact. |
| 4 | Related topic: *"+81"* | Canonical Knowledge | Wikipedia infobox link, unfiltered | Topic → `article.links[0]` → Japan's international dialing code, linked from the infobox → `en.wikipedia.org/wiki/Japan` | Technically a genuine Wikipedia link, but a phone country code is not "related content" by any reasonable reader standard — the clearest illustration that the related-topics pipeline filters for "is this a link on the page," not "would a reader want to read this next." |
| 5 | Knowledge graph: `Japan GOVERNED_AS "Compiled detail for government"` | Knowledge Graph | Compounded template | Triple → `sf.government` → Stage 4 placeholder → UNKNOWN | Same class of defect as Inception's director/composer triples, here in object position. |

### Where Failure Classes First Appear — Japan

- **Placeholder content**: Stage 4, same mechanism; additionally demonstrates the ontology-field-name mismatch noted in Stage 15 (no `capital` field exists at all, unlike what `VisualSnapshot.tsx` expects).
- **Malformed questions**: Stage 7, same mechanism, worst instance for the "Government" chapter — *"How do key chemical processes behave during Government?"* — a chemistry question applied to a nation's political system, because the fixed template array (index 2 is always chemistry-flavored) has no ontology awareness at all.
- **Generic timelines**: Stage 4; Japan is the clearest example of the *significance* failure mode (2026 as "earliest milestone" for a country with millennia of documented history), distinct from Inception's merely-generic-but-dated-correctly timeline.
- **Weak Did-You-Know facts**: same mechanism; Japan's is the only topic where the top "surprising" fact (Japan is an island country in the Pacific) is closer to a dictionary definition than a surprising fact — `CLAUDE.md` explicitly prohibits "article definitions and generic summaries" as Did You Know content, and this fact is exactly that.
- **Irrelevant Related Topics**: Stage 4/13; Japan's "+81" and ".jp" are the most concrete illustration in this audit of the raw-link-slice problem, since they're unambiguously *not* topical content by any definition.
- **Where hallucination becomes possible**: same structural point as the other two topics (Stage 4's unconstrained extraction), amplified by the observation that Stage 7's fallback can synthesize an **entirely fact-free chapter** (Japan chapter 5) when the ranked-facts pool runs out — on the LLM path, this same "pool exhausted" condition is exactly the scenario most likely to tempt a language model to invent a plausible-sounding fact to fill the gap, since nothing in the architecture prevents it from doing so once `approvedFacts` is empty.
- **Where validation should have rejected them**: every gap already listed for the other two topics, plus a new one specific to Japan: **no rule checks whether a chapter's `approvedFacts`/`keyFacts` are non-empty and non-templated** — chapter 5 shipped with zero real content and passed every check.

---

## Cross-Topic Failure-Origin Summary

| Failure Class | First Appears At (Stage) | File : Function | Why Validation Missed It |
|---|---|---|---|
| Placeholder structured facts (`"Compiled detail for X"`) | 4. Canonical Knowledge | `compiler.ts` : `getFallbackCompilation()` | `no_placeholder_wording` matches only literal words "placeholder"/"tbd"/"n/a" |
| Placeholder array fields (`["Significant Item 1", ...]`) | 4. Canonical Knowledge | `compiler.ts` : `getFallbackCompilation()` | Not matched by any linter rule at all |
| Placeholder propagation into knowledge graph | 5. Knowledge Graph | `knowledgeGraph.ts` : `getFallbackGraph()` | No rule inspects triple subject/object content for placeholder-shaped strings |
| Hardcoded, non-representative confidence scores | 2, 4, 13 (Entity Resolution, and `dag.ts`'s artifact assembly) | `entityResolver.ts` (0.96), `dag.ts` (0.95 and 0.92 literals, artifact-payload construction) | `compiler_confidence_ok`/`overall_confidence_ok` check `>= 0.70` against numbers that are hardcoded constants, not measurements |
| Malformed/incoherent reader questions | 7. Narrative Planning | `narrativePlanner.ts` : `getFallbackPlan()` | `readerQuestion` is never scanned by any linter rule |
| Generic timeline headlines | 4. Canonical Knowledge | `compiler.ts` : `getFallbackCompilation()` | `no_timeline_milestone_placeholder` matches only "significant milestone" |
| Contextually wrong timeline dates (Japan's 2026) | 4. Canonical Knowledge | `compiler.ts` : `getFallbackCompilation()` | No rule assesses date plausibility, only presence/count/order |
| Sentence-destroying 11-word truncation | 9. Documentary Writer | `documentaryWriter.ts` : `cleanFact()` (used by both `getFallbackSummary()` and `getFallbackCard()`) | `sentence_provenance_ok` compares a truncated sentence to a truncated fact — a tautology (Bug #20) |
| `referenceLabel` collapsing to "The" | 9. Documentary Writer | `documentaryWriter.ts`, both `writeDocumentaryCard()` (line ~145) and `getFallbackCard()` (line ~411) | Not a content-quality rule at all — no rule checks UI-label distinctiveness |
| Irrelevant related topics / read-more links | 4. Canonical Knowledge (input), 13. API (unfixed) | `compiler.ts` : `getFallbackCompilation()`; `editorial/related.ts` : `curateRelatedExploration()` | No relevance check exists at either stage; `related.ts`'s own scoring has a no-op term (Bug #10) |
| Fact-free chapters (Japan chapter 5) | 7. Narrative Planning | `narrativePlanner.ts` : `getFallbackPlan()` | No rule checks `approvedFacts`/`keyFacts` for non-empty, non-templated content |
| Timeline chronology (the one thing correctly caught) | 11. Validation | `linter.ts` : `timeline_chronological` check | Correctly detected in 2 of 3 topics, but routed to `warnings` not `errors`, so it cannot affect `passed` (Bug #18) |

---

## If Rebuilt From Scratch Today: Which Stages Would Disappear Completely?

Answering stage by stage, against the live 15-stage pipeline (the two dead architecture
generations — V13/V14's `editorial/` engine and V14.5's component set — are already gone from
the *active* pipeline and are excluded from this question; see `docs/ARCHITECTURE.md`):

1. **Wikipedia Retrieval** — **stays**, but merges with Entity Resolution's redundant second
   fetch into a single retrieval call.
2. **Entity Resolution** — **stays**, but the hardcoded `0.96` confidence literal disappears;
   any fallback confidence must be computed from something real (e.g. Wikidata instance-of
   claim match strength), never invented to route around a verification step.
3. **Ontology Classification** — **stays unchanged**. This layer showed zero defects across
   all three traces; it is a clean, data-driven map doing exactly one job well.
4. **Canonical Knowledge (Compiler)** — **partially disappears**. Any field Wikidata already
   structures (birth/death dates, population, capital, founding date, director via property
   P57, etc.) would be filled directly from Wikidata claims, deterministically and without an
   LLM call. The `"Compiled detail for X"` template disappears entirely — a field is either
   filled from a real source or the module is hidden, per `CLAUDE.md`'s own rule. The LLM
   would only be invoked for fields Wikidata doesn't structure (themes, legacy narrative).
5. **Knowledge Graph** — **mostly disappears as a generation step**. Wikidata's own claims
   already *are* subject-predicate-object triples; this stage becomes "import relevant
   Wikidata claims," with LLM enrichment only for relationships Wikidata lacks. The
   placeholder-propagation bug (#2) becomes structurally impossible, because there is no
   longer a fallback template generating fake subjects to begin with.
6. **Fact Ranking** — **stays but shrinks**. With Wikidata supplying verified core facts,
   this stage's job narrows to ranking genuinely optional *trivia* for narrative/surprise
   value, not assessing whether basic factual claims are trustworthy.
7. **Narrative Planning** — **stays**, but the fixed-by-index `fallbackQuestions` template
   array disappears, replaced by ontology-and-chapter-aware question construction even in a
   deterministic fallback mode.
8. **Fact Script** — **stays unchanged**. This is the one stage this audit found no
   fallback-specific defect in beyond inheriting bad inputs — the "raw bullets only, no
   prose" design (V16's decision) is sound.
9. **Documentary Writer** — **stays**, but `cleanFact()`'s blind 11-word truncation and the
   `chapterTitle.split(" ")[0]` `referenceLabel` bug both disappear, replaced by
   grammatically-complete summarization and a label derived from the chapter's ontology-fixed
   `referenceLabel` blueprint slot (e.g. "Origins," "Legacy") rather than a title-word split.
10. **Style Polish** — **disappears as a separate stage**. It is a third sequential LLM call
    per chapter whose only job is rhythm — and in all three traced topics it silently
    contributed nothing (its call failed and fell through to a pure pass-through with zero
    fallback template). A single, well-structured Documentary Writer prompt can produce
    polished prose directly; splitting "write" and "polish" into two round-trips triples
    per-chapter LLM calls for a benefit this trace found no evidence of actually landing.
11. **Validation** — **stays and grows substantially**. This is the stage most in need of
    survival: semantic (not substring) placeholder/timeline detection, hardcoded-confidence
    detection, graph-triple meaningfulness checking, non-empty-fact-per-chapter checking, and
    promoting `timeline_chronological` (and similar currently-underpowered rules) from warning
    to error where the defect is severe enough.
12. **Cache** — **stays**, but gains a real quality gate (generation-provenance ratio) instead
    of only a dependency-hash version check.
13. **API** — **stays**, but the `any`-typed response-shaping and the long ontology-name
    if/else chain (`route.ts`) become a typed discriminated union per ontology.
14. **Frontend** — **stays essentially unchanged**. The seven live components and their design
    language showed no defects in this trace beyond faithfully rendering whatever they were
    given — that is correct behavior for a rendering layer.
15. **Rendered UI** — **stays unchanged**, for the same reason.

**Net answer:** one full stage (Style Polish) disappears outright; two stages (Knowledge
Graph, and half of Canonical Knowledge) are replaced by deterministic Wikidata imports rather
than LLM generation; every other stage survives with a fix to a specific, named defect rather
than a redesign.

---

## TOP 20 BUGS

Ranked by a composite of severity, user impact, ease of fixing, and architectural importance
(highest overall priority first — see the "Why This Rank" column for the specific weighting
reasoning per item).

| # | Bug | Severity | User Impact | Ease of Fix | Arch. Importance | File : Function | Why This Rank |
|---|---|---|---|---|---|---|---|
| 1 | `compiler: 0.95` and `overall: 0.92` confidence scores are **hardcoded literals**, never computed from actual compilation quality | Critical | Critical (indirect — this is *why* nothing else gets caught) | Trivial (compute real values from real signals) | Critical | `dag.ts` : artifact-payload construction (~line 180-183) | Root-cause status: the two confidence gates meant to catch a bad compilation mathematically cannot fail. Fixing this one thing re-enables an entire class of existing checks. |
| 2 | Placeholder structured-fact values propagate into the knowledge graph as real entity data (`"Compiled detail for director" DIRECTED Inception`) | Critical | High (data-integrity defect, not just cosmetic) | Small (check value against placeholder pattern before emitting a triple) | High | `knowledgeGraph.ts` : `getFallbackGraph()` | A data-integrity bug compounds every downstream consumer of the graph, present or future. |
| 3 | Every traced topic fell back on every LLM call despite a configured `GEMINI_API_KEY` | Critical | Critical (proximate cause of nearly everything else in this report) | Unknown until diagnosed live (needs runtime investigation, not a code fix) | Critical | Systemic — every `knowledge/*.ts` stage's `catch` block | This is the fact that makes every other bug in this list currently *observable in production* rather than theoretical. |
| 4 | `runHeuristicClassification()` confidence hardcoded to `0.96` specifically to skip the disambiguation re-verification pass | High | Medium (affects entity-resolution accuracy for ambiguous topics) | Trivial (compute or lower the literal) | Medium | `entityResolver.ts` : `runHeuristicClassification()` (line 208) | A safety mechanism that exists in the code is deliberately bypassed by its own fallback's invented number — a design contradiction, cheap to fix. |
| 5 | `cleanFact()` truncates every fact/cause/effect/takeaway to exactly 11 words with no grammatical awareness, routinely cutting off the sentence's actual payload | High | High (directly, visibly degrades every sentence a reader sees in fallback mode) | Medium (needs a real sentence-boundary-aware summarizer, not just a longer limit) | Medium | `documentaryWriter.ts` : `cleanFact()` | Highest *density* of user-visible defect per line of code in this entire audit — one function, every sentence. |
| 6 | `readerQuestion` built from a fixed 5-question array indexed by chapter position, zero ontology awareness | High | High (first thing a reader sees per chapter) | Small (ontology-aware templates, still cheap even if deterministic) | Medium | `narrativePlanner.ts` : `getFallbackPlan()` | Produces the literal `CLAUDE.md` bad-example sentence, verified present in all three traced topics. |
| 7 | Timeline built from every raw 4-digit number in the extract, no significance filter — surfaces citation years (Japan's 2026) as "historical milestones" | High | High (visibly nonsensical to any reader who knows the topic) | Medium (needs proximity-to-named-entity heuristics at minimum) | Medium | `compiler.ts` : `getFallbackCompilation()` | The single most easily reader-verifiable defect in the report (anyone knows Japan predates 2026). |
| 8 | `referenceLabel: chapterTitle.split(" ")[0]` collapses to `"The"` for any title starting with "The" — **present in the LLM-success path too, not fallback-specific** | High | Medium (degrades the chapter-progress UI, not the prose itself) | Trivial (use the ontology's fixed `referenceLabel` blueprint slot instead) | Low | `documentaryWriter.ts` : `writeDocumentaryCard()` (line ~145) and `getFallbackCard()` (line ~411) | Notable specifically because it survives even a fully-working LLM call — not contingent on Bug #3 being fixed. |
| 9 | A third, uncaught placeholder pattern: `["Significant Item 1", "Significant Item 2"]` for array-typed fields | High | Medium | Trivial (add to the placeholder pattern list) | Low | `compiler.ts` : `getFallbackCompilation()` (line 123) | Cheapest fix on this list relative to its severity — one array literal to detect. |
| 10 | `curateRelatedExploration()`'s `graph_proximity` scoring term is a structural no-op — always true by construction, contributes a constant to every score | Medium-High | Medium (silently weakens an otherwise-real scoring formula) | Small (remove or replace the term) | Medium | `editorial/related.ts` : `computeSimilarityScore()` | A logic bug independent of the fallback/LLM distinction — this one degrades quality even on a fully-working LLM run. |
| 11 | No stage records which generation path (Wikidata/LLM/fallback) produced a given field | High | High (blocks fixing/measuring nearly everything else) | Medium | Critical | `types/knowledge.ts` : `KnowledgeArtifact` (schema gap) | Architectural prerequisite for Bugs #1, #3, and the Cache-quality-gate fix — ranked below its dependents only because it's an enabler, not a symptom. |
| 12 | `no_timeline_milestone_placeholder` matches only "significant milestone," missing "Pivotal era in {year}" (present in all 18 traced timeline entries) | Medium | High (this exact phrase reaches every reader on every fallback-compiled topic) | Trivial (add the pattern) | Low | `linter.ts` : `no_timeline_milestone_placeholder` check | Trivial fix, high observed frequency (100% of traced timeline entries). |
| 13 | `no_placeholder_wording` matches only "placeholder"/"tbd"/"n/a," missing "Compiled detail for {field}" | Medium | High (present in every required field of every fallback-compiled topic) | Trivial | Low | `linter.ts` : `no_placeholder_wording` check | Same class as #12 — trivial fix, maximal observed frequency. |
| 14 | `readerQuestion` never scanned against `BANNED_AI_WORDS_PHRASES` or for well-formedness | Medium | High | Small | Low | `linter.ts` (missing check) | Directly enables Bug #6 to reach readers undetected. |
| 15 | `graph_connected` passes trivially whenever subject/object equals the topic title — true for every `Detail_Aspect_N` filler triple | Medium | Low-Medium (mostly latent — `KnowledgeGraph.tsx` isn't currently rendered) | Small | Medium (matters more once #4/Future Architecture's graph work lands) | `linter.ts` : `graph_connected` check | Currently low *visible* impact only because the graph isn't rendered anywhere yet — ranked for architectural readiness, not present-day user harm. |
| 16 | SEO `metaDescription` built via `slice(0,155)` on a summary that may itself be fallback text — search-result snippets show `"{Topic} records confirm that..."` | Medium | Medium (affects discoverability/click-through, external to the app itself) | Small (gate on generation-provenance once #11 exists) | Low | `route.ts` : `buildStage15SEO()` | Real-world impact happens outside the app (in search results), making it easy to overlook internally but consequential externally. |
| 17 | Did-You-Know `readMoreTopic` relevance is positional luck, not a filter — ranges from plausible (Inception→12 Monkeys) to nonsensical (Japan→"+81") | Medium | Medium | Small-Medium (needs the same relevance work as Bug #10) | Low | `compiler.ts` : `getFallbackCompilation()` (trivia mapping) | Inconsistent by nature (sometimes looks fine), which makes it a harder bug to notice in casual QA than Bug #7. |
| 18 | `timeline_chronological` correctly detects real defects (2 of 3 traced topics) but is a `warning`, not an `error`, so it cannot affect `passed` | Medium | Low-Medium (the defect it detects is real but not the most severe on this list) | Trivial (flip `isWarning` to `false`, or add a severity threshold) | Low | `linter.ts` : `timeline_chronological` registration (line 50) | The one rule in this audit proven to work correctly — promoting it to a hard error is nearly free and immediately useful. |
| 19 | Duplicate Wikipedia retrieval — `wikipedia.ts` and `entityResolver.ts` independently fetch the same article's metadata | Low-Medium | Low (latency/cost, not correctness) | Small (share one fetch) | Low | `wikipedia.ts` : `getArticleIntelligence()`; `entityResolver.ts` : `fetchWikiMetadata()` | Pure efficiency issue, no content-quality impact — ranked last among the "real, fixable" bugs for that reason. |
| 20 | `sentence_provenance_ok`'s check is a tautology when both the sentence and its mapped fact were truncated by the same `cleanFact()` call before the check runs | Low | Low (the check technically "passes," but proves nothing) | Small (compare against the untruncated original fact) | Low | `linter.ts` : `sentence_provenance_ok` / `checkProvenance()` (line ~246) vs. `documentaryWriter.ts` : `cleanFact()` | Lowest-severity item on this list — a validation-integrity nuance rather than a reader-visible defect, included because it explains why provenance checking gave false confidence throughout this trace. |

---

*No code was modified in the production of this report. Every file:function reference above
was verified against the current state of the repository at the time of this audit.*
