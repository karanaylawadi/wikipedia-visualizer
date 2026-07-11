# Visualizer Wiki V19 — Approved Stitch Design

The files inside `export/` are the approved visual reference for the V19 redesign.

## Source-of-truth rule

These exported Stitch screens define:

- visual hierarchy
- layout
- spacing
- typography
- colors
- component proportions
- responsive intent
- interaction direction

Claude must implement these designs in the existing Next.js application.

## Important constraints

- Do not replace the existing application architecture with the exported static HTML.
- Do not remove the current knowledge pipeline, APIs, validation, caching, SEO, or business logic.
- Treat exported HTML/CSS as visual reference and reusable design guidance.
- Convert the design into maintainable React/Next.js components.
- Preserve existing functionality unless a V19 requirement explicitly changes it.
- Do not copy generated code blindly.
- No implementation should be committed or pushed without review.

## Approved screens

- Homepage
- Dynamic search suggestions
- AI knowledge-synthesis loading screen
- Results page
- Featured-articles page

## Results-page hierarchy

1. Hero
2. Editorial summary, maximum 250 words
3. Did You Know, maximum 5 facts and hidden when empty
4. Timeline when available
5. Knowledge graph
6. Continue Learning / related topics
7. Optional images with no empty image placeholders

## Homepage hierarchy

1. Minimal search-first hero
2. Dynamic Wikipedia autocomplete
3. Compact feature indicators
4. No featured-article grid on the homepage
5. Featured articles live on a separate scalable page
