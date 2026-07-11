# Golden Outputs

Evaluation criteria for six flagship topics. These six were chosen because together they
span the product's identity: four (Space Race, Photosynthesis, Japan, Inception) are in the
automated benchmark suite (`scripts/run-benchmarks.ts`); Renaissance Art and Napoleon
Bonaparte are the two historical/biographical entries from the homepage's featured-topics list
(`app/page.tsx`, `SearchBar.tsx`).

Where a real cached artifact exists under `knowledge/`, "What Failure Looks Like" quotes it
directly rather than describing a hypothetical — this is the actual content the app would
currently serve for that topic.

General editorial requirements, restated from `CLAUDE.md` and enforced (in principle) by
`src/lib/knowledge/linter.ts`, apply to every topic below: no invented facts, no raw
Wikipedia lead used as trivia, no placeholder content, no generic timeline labels, every
timeline item names a real event, every related topic has a clear semantic relationship,
every Did You Know item is one memorable fact under 60 words, hide a module rather than fill
it with weak content.

---

## Space Race

**Ontology:** Historical Event (`ontologyEngine.ts` — matched via `t.includes("space
race")` in the heuristic path). Blueprint: Causes → Early Battles → Turning Point → Outcome
→ Legacy. Required fields: causes, timeline, participants, turningPoints, outcome, impact.

**What good looks like:** Causes chapter opens on the 1955 US satellite announcement and the
1957 Sputnik launch, names Kennedy's 1961 "before this decade is out" speech as the turning
point, and closes on the 1975 Apollo–Soyuz handshake as the legacy/détente beat. Timeline
entries are real dated events (Sputnik 1, Vostok 1/Gagarin, Apollo 11) with specific
headlines, not "Pivotal era in {year}." Related topics are things a reader of this article
would plausibly click next — Sputnik crisis, Apollo program, Cold War, Yuri Gagarin — not
unrelated 20th-century political events.

**What failure looks like (this is the actual committed artifact,
`knowledge/historical_event/space-race.json`):**
- Reader question: *"What represents the starting motivation behind Causes?"* — verbatim,
  the malformed-question example `CLAUDE.md` names as bad.
- Timeline: `"headline": "Pivotal era in 1957"`, `"description": "Space Race underwent core
  changes and reached major development in the year 1957"` — for every one of six entries.
- Structured facts: `"causes": "Compiled detail for causes"`,
  `"turningPoints": "Compiled detail for turningPoints"` — literal placeholder text.
- Related topics: "1948 Arab–Israeli War," "1948 Czechoslovak coup d'état," "12-3 incident" —
  none plausibly related to the Space Race.
- Knowledge graph: eight `Space Race → HAS_PROPERTY → Detail_Aspect_N` triples, carrying no
  information.

**Editorial quality requirements:** name the actual milestones (Sputnik 1, Vostok 1, Apollo
11, ASTP) in both the timeline and chapter prose; every chapter must answer a real,
well-formed question; trivia should draw on the genuinely surprising material already present
in the Wikipedia extract (the 1921 Soviet Gas Dynamics Laboratory, the V-2 rocket lineage) —
that material exists in `rankedFacts` in the cached artifact and simply isn't being used.

---

## Renaissance Art

**Ontology:** Art Movement. The cached artifact is keyed to the plain title "Renaissance"
(`knowledge/art_movement/renaissance.json`) — a reader searching "Renaissance Art" depends on
entity resolution correctly aliasing that phrase to the Wikipedia article "Renaissance."
Blueprint: Origins → Key characteristics → Masterpieces → Spread → Legacy. Required fields:
origins, artists, techniques, majorWorks, influence.

**What good looks like:** Origins names Florence and the Medici patronage system, not a
generic "cultural period." Masterpieces chapter names specific works (the Mona Lisa, the
Sistine Chapel ceiling) and specific artists (Leonardo, Michelangelo, Raphael) — the ontology
requires at least 3 major works to be listed. Trivia strategy per `ontologyEngine.ts` should
surface manifestos, public reactions, materials, and artist rivalries — genuinely surprising
art-history detail, not generic movement description.

**What failure looks like (actual committed artifact):**
- Subtitle is accurate ("European cultural period of the 14th to 17th centuries") but every
  downstream field degrades: reader question *"What represents the starting motivation
  behind Origins?"*
- Timeline: `"headline": "Pivotal era in 1517"`, description reads "Renaissance underwent
  core changes and reached major development in the year 1517" — no mention of Luther's 95
  theses, which is what actually happened in 1517 and is presumably why that year was picked
  up by the year-regex fallback in the first place.
- Related topics: "'Polish death camp' controversy," "1948 Palestine war," "2022 Russian
  invasion of Ukraine" — years apart from and topically unrelated to the Renaissance. This is
  the clearest evidence that fallback related-topic assignment is positional noise, not a
  relevance judgment.

**Editorial quality requirements:** origins must cite Florence/the city of origin by name
(ontology validation rule); at least 3 major works named; timeline events must be real
Renaissance milestones (Medici patronage beginning, Michelangelo's David, the Sistine Chapel
completion, Vasari's *Lives of the Artists*), not arbitrary years pulled from the extract.

---

## Napoleon Bonaparte

**Ontology:** Person (would resolve via the "births/deaths/biography" heuristic path or
direct LLM classification). Blueprint: Early Life → Rise → Peak → Challenges → Legacy.
Required fields: birth, death, occupation, majorWorks, awards, legacy, controversies.

**Coverage gap:** there is no cached artifact for this topic anywhere under `knowledge/`, and
it does not appear in `scripts/run-benchmarks.ts`'s 16-topic suite. It exists only as a
homepage/search-bar featured suggestion (`app/page.tsx`, `SearchBar.tsx`) — meaning it has
**never been validated end-to-end**. It is included here specifically because it's presented
to every visitor as a one-click featured topic, and no one has confirmed what that click
actually produces.

**What good looks like:** Early Life names Corsica and his military academy education; Rise
covers the French Revolution and his early Italian campaign; Peak covers the 1804 coronation
as Emperor and the Napoleonic Code; Challenges covers the Russian campaign and 1812 retreat;
Legacy covers Waterloo (1815) and Saint Helena exile. Controversies field (required by the
Person ontology) should not be left empty or generic — this is a topic where it is
substantively meaningful (the Haiti slavery reinstatement, the scale of Napoleonic War
casualties).

**What failure would look like:** by direct analogy to every other cached Person/Historical-
adjacent artifact in this repo, expect the same class of failure — "Pivotal era in {year}"
timeline entries, "What represents the starting motivation behind Early Life?" as a reader
question, and `"controversies": "Compiled detail for controversies"` if the LLM path fails.
This should be the first topic re-verified once the V17.1 linter fixes in
[`ROADMAP.md`](ROADMAP.md) land, precisely because it has no existing safety net.

---

## Photosynthesis

**Ontology:** Science. Blueprint: Problem → Discovery → Mechanism → Evidence → Applications.
Required fields: formula, discovery, discoverer, applications, limitations, currentResearch.

**What good looks like:** Discovery chapter names Jan Ingenhousz's 1779 experiments (real
date, actually present in the source extract). Mechanism explains light-dependent and
light-independent (Calvin cycle) reactions concretely. Applications names at least two
real-world uses (crop science, biofuel research) per the ontology's validation rule.

**What failure looks like (actual committed artifact,
`knowledge/science/photosynthesis.json`):**
- Reader question: *"What represents the starting motivation behind Problem?"*
- Timeline: `"headline": "Pivotal era in 1779"`, description "Photosynthesis underwent core
  changes and reached major development in the year 1779" — the year is correct
  (Ingenhousz) but the headline throws away the one specific, real detail the source
  material actually contains.
- Structured facts: `"formula": "Compiled detail for formula"` — for a Science-ontology
  topic, failing to render the actual chemical equation
  (6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂) is a near-total loss of the one piece of information
  a reader most wants from this specific page.
- Related topics: "3-phosphoglycerate," "ATP synthase" (genuinely relevant) mixed
  indiscriminately with unrelated entries further down the list — no relevance filter is
  applied to the raw link set.

**Editorial quality requirements:** the formula field is non-negotiable for this topic — it
must render the actual reaction, not placeholder text; discovery must name Ingenhousz and
1779 specifically in prose, not just in the timeline year field; applications must list at
least 2 concrete real-world uses per the ontology's own validation rule.

---

## Japan

**Ontology:** Country. Blueprint: Origins → History → Government → Culture → Modern Nation.
Required fields: government, geography, economy, culture, population, tourism.

**What good looks like:** Origins/History cover the Yamato period through the Meiji
Restoration; Government names the constitutional monarchy / parliamentary system
specifically; Modern Nation covers the postwar economic miracle. Population field contains
an actual census figure or estimate (ontology validation rule).

**What failure looks like (actual committed artifact, `knowledge/country/japan.json`):**
- Reader question: *"What represents the starting motivation behind Origins?"*
- Timeline's first entry: `"year": "2026"`, `"headline": "Pivotal era in 2026"` — a country
  with over a thousand years of documented history has its earliest fallback timeline entry
  anchored to the current year, because the fallback timeline-builder simply grabs whichever
  4-digit numbers appear in the extract (likely a citation date or population-as-of year),
  with no judgment about historical significance.
- Structured facts: `"government": "Compiled detail for government"` — for a Country
  ontology, failing to name the actual government system violates the ontology's own
  validation rule ("Government system must be categorized, e.g. Republic, Monarchy") while
  still reporting `required_fields_exist: true`, because the linter only checks that the
  field is non-empty, not that it isn't placeholder text.
- Related topics: "+81" (a phone country code) and ".jp" (a TLD) as the top two related
  topics — technically linked from the Wikipedia infobox, but not meaningful reader-facing
  related content.

**Editorial quality requirements:** government field must name the actual system
(constitutional monarchy with a parliamentary Diet), not placeholder text; timeline must be
anchored to real historical dates, not arbitrary numbers found in the extract; population
figure must be a real census estimate; related topics must be filtered to exclude
non-topical infobox artifacts like phone codes and TLDs.

---

## Inception

**Ontology:** Movie. Blueprint: Story → Production → Release → Reception → Legacy. Required
fields: director, cast, composer, themes, awards, reception.

**What good looks like:** Story names the dream-within-a-dream premise and protagonist Dom
Cobb; Production names Christopher Nolan as director and Hans Zimmer as composer (ontology
requires composer not be confused with cast — an explicit validation rule); Release names the
2010 date; Reception cites its critical/box-office reception; Legacy covers its influence on
subsequent blockbuster filmmaking.

**What failure looks like (actual committed artifact, `knowledge/movie/inception.json`):**
- Reader question: *"What represents the starting motivation behind Story?"* — a category
  error even by the fallback template's own logic: "motivation behind Story" is not a
  coherent question for a film's plot chapter.
- Timeline: `"headline": "Pivotal era in 2010"`, description "Inception underwent core
  changes and reached major development in the year 2010" — the release year is right, the
  description is content-free.
- Structured facts: `"director": "Compiled detail for director"`,
  `"composer": "Compiled detail for composer"` — for a Movie ontology, omitting the director
  and composer by name is close to omitting the two most load-bearing facts the page exists
  to deliver.
- Related topics: "12 Monkeys," "1917 (2019 film)," "2001: A Space Odyssey" — plausible
  genre-adjacent films, better than most of the other examples above, but still an artifact
  of raw link proximity rather than a deliberate "similar films" curation.

**Editorial quality requirements:** director and composer must be named explicitly (Nolan,
Zimmer) — the ontology's own validation rules single these out ("Director field must not be
empty," "composer must not contain actor names"); cast must be a real cast list, not
"Significant Item 1, Significant Item 2" (the fallback compiler's literal placeholder for
array fields); box office and reception should use real, specific figures already present in
the Wikipedia extract.
