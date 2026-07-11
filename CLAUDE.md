# Visualizer.wiki — Claude Project Instructions

## Product mission

Visualizer.wiki transforms verified English Wikipedia knowledge into concise,
trustworthy and visually engaging interactive documentaries.

The product should feel like a premium digital publication, not an AI dashboard.

Primary inspirations:
- The New York Times
- The Wall Street Journal
- National Geographic
- Apple editorial pages
- Google Arts & Culture
- The Pudding

## Current project status

The project has evolved through multiple releases:

- V15: Knowledge Operating System and canonical artifact compiler
- V16: Fact-script pipeline and documentary writer
- V17: Editorial intelligence, search improvements and documentary UI

The current priority is editorial reliability.

Do not start a major UI redesign until the existing content pipeline produces
correct, concise and relevant output for benchmark topics.

## Non-negotiable content rules

- Never invent facts.
- Never present unsupported claims.
- Never use raw Wikipedia lead paragraphs as trivia.
- Never render placeholder content.
- Never use generic timeline labels such as:
  - Pivotal era
  - Significant milestone
  - Core changes
  - Major development
- Every timeline item must describe a real named event.
- Every related topic must have a clear semantic relationship.
- Every Did You Know item must contain one memorable fact.
- Hide a module if valid content cannot be produced.

## Writing rules

Use direct, natural English.

Prefer:
- names
- dates
- places
- events
- concrete actions
- clear cause and effect

Avoid:
- records verify
- data confirms
- subsequent investigations
- motivating factors behind
- fundamental lessons
- framework
- mechanism, unless technically required
- collectively
- this demonstrates
- this indicates
- compiled evidence
- industry practitioners
- our team selected

Paragraphs should normally contain 2–4 sentences.

Sentences should usually average 12–22 words.

Do not write circular or malformed questions.

Bad:
"What represents the starting motivation behind causes?"

Good:
"What pushed the United States and Soviet Union into a race for space?"

## Did You Know rules

Did You Know is a signature product feature.

Each item must:
- focus on exactly one fact
- be genuinely surprising or memorable
- have a short headline
- contain no more than 60 words in collapsed form
- include source provenance internally
- exclude article definitions and generic summaries

Do not expose numerical surprise scores in the UI unless properly calibrated.

## Timeline rules

Every event must contain:
- date or year
- specific event title
- concise explanation
- source-supported relationship to the topic

Do not display a timeline with fewer than 3 valid events.

## Related-topic rules

Every recommendation must pass at least one:
- strong knowledge-graph connection
- ontology-compatible relationship
- direct Wikipedia relationship
- shared people, event, place, work or concept

Do not fill recommendation slots with weak matches.

## Architecture rules

Maintain clear separation between:
1. Wikipedia retrieval
2. Entity resolution
3. Ontology classification
4. Canonical knowledge
5. Knowledge graph
6. Importance scoring
7. Narrative planning
8. Fact script
9. Documentary writing
10. Style polishing
11. Validation
12. UI rendering

UI components must not contain knowledge-generation logic.

Writers must not fetch raw Wikipedia independently.

## Coding rules

- Use TypeScript.
- Preserve strict typing.
- Avoid `any`.
- Prefer small, single-responsibility modules.
- Do not create duplicate components.
- Do not silently delete working architecture.
- Explain significant architectural changes before implementing them.
- Work on a feature branch.
- Never push directly to `main`.
- Do not commit generated caches unless explicitly requested.

## Required checks before completion

Run:

```bash
npm run lint
npx tsc --noEmit
npm run build
npx tsx scripts/run-benchmarks.ts
```
