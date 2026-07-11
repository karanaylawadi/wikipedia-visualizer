# UI Guidelines

This documents the design language as it actually exists in `src/app/globals.css` and the
seven components the app actually renders, not an aspirational style guide. An earlier draft
of this file claimed the typeface is "Inter" — that is incorrect and has been corrected below.

## Live vs. Dead Component Surface

Only these components are reachable from `src/app/page.tsx`, `src/app/results/page.tsx`, and
`src/app/layout.tsx`:

- `SearchBar.tsx` — homepage search + autocomplete overlay
- `EditorialCarousel.tsx` → `EditorialSlide.tsx` — the documentary chapter reader
- `VisualSnapshot.tsx` — ontology-specific structured-fact tabs
- `FactCards.tsx` — "Did You Know" grid + expansion modal
- `KnowledgeJourney.tsx` — chronological timeline
- `DiscoveryCarousel.tsx` — "Continue the Journey" related-topic cards
- `GoogleAnalytics.tsx` — tracking only, no visible UI

Fourteen other components in `src/components/` (`AISummary`, `ArticleCard`, `Carousel`,
`EmptyState`, `HeroImage`, `KnowledgeGraph`, `Loading`, `PeopleAlsoExplored`,
`PerspectiveGrid`, `RelatedArticles`, `RelatedJourney`, `Timeline`, `TimelineCard`,
`VisualModules`) have zero import references anywhere in `src/app`. They represent an earlier
visual language — including a React Flow node-graph view in `KnowledgeGraph.tsx` — that was
replaced by the current documentary-carousel design but never deleted. Do not treat their
styling as current guidance; do not wire one up without a deliberate design decision (see
[`DECISIONS.md`](DECISIONS.md)).

## Theme

CSS variables in `src/app/globals.css`:

| Token | Value | Use |
|---|---|---|
| `--background` | `#030303` | homepage |
| (results page) | `#090A0F` | slightly lifted near-black for the results shell |
| `--foreground` | `#f5f5f7` | primary text |
| `--accent-cyan` | `#00f5a0` | primary accent (also referenced as `cyan-400`/`cyan-500` via Tailwind) |
| `--accent-blue` | `#007cf0` | gradient accent |
| `--accent-violet` | `#7928ca` | secondary accent |

Body text otherwise sits on `neutral-300`–`neutral-500` (Tailwind's neutral scale) for
secondary/tertiary copy, never pure white except for headlines.

## Typography

There is **no imported font**. `layout.tsx` does not use `next/font`, and
`globals.css` sets:

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, sans-serif;
```

The type system is expressed entirely through Tailwind utility scale, in two registers:

- **Eyebrows / meta / labels**: `text-[8px]` to `text-[11px]`, `uppercase`,
  `tracking-[0.2em]`–`tracking-[0.4em]`, `font-bold`/`font-semibold`, often `font-mono`.
  Example: `CHAPTER 01 / 4 MIN READ / HISTORICAL EVENT` in `EditorialSlide.tsx`.
- **Headlines / body**: `text-3xl` to `text-8xl`, `font-extrabold`, `tracking-tight`,
  frequently gradient-clipped (`bg-gradient-to-b from-white to-neutral-400/500
  bg-clip-text text-transparent`). Body copy is `text-sm`–`text-xl`, `font-light`,
  `leading-relaxed`/`leading-loose`, and is width-constrained for readability
  (`max-w-[65ch]` in `EditorialSlide.tsx`).

## Spacing

- Section rhythm: `py-16 md:py-24` between major results-page sections.
- Containers: `max-w-4xl` (editorial reading width) or `max-w-5xl` (page shell).
- Grids/flex gaps: `gap-6`, `gap-8`, `gap-12`, `gap-16` depending on density.

## Component Hierarchy

Every section on the results page follows the same header pattern: a small uppercase
tracked-out eyebrow line in cyan, followed by a gradient-clipped `h2`. This repeats
verbatim in `FactCards`, `KnowledgeJourney`, and `DiscoveryCarousel` — treat it as the
section-header contract for any new module.

Cards and panels are hairline-bordered, not shadowed:

- Idle: `border border-white/5`, background `bg-white/[0.02]`–`bg-[#07080c]/50`.
- Hover/active: border shifts to `border-cyan-400/20`–`30`, background lightens slightly,
  sometimes a soft colored glow (`shadow-[0_0_20px_rgba(...)]`) — never a neutral drop
  shadow.
- Corners are large and consistent: `rounded-2xl` for cards, `rounded-3xl` for large panels,
  `rounded-full` for pills/buttons/badges.
- Glass panels (`.glass-panel`, `.premium-card` in `globals.css`) use
  `backdrop-filter: blur(12–20px)` over a near-black translucent fill — used sparingly, for
  floating overlays (autocomplete panel, "Did You Know" modal), not for every card.

## Interaction Philosophy

- Hover is subtle: border/background opacity shifts and `scale-[1.02]`–`[1.05]`, not
  elevation or heavy shadow.
- Buttons "lift" via `hover:scale-[1.03]` plus a colored glow, not a translateY shadow trick.
- Keyboard navigation is treated as first-class, not an afterthought:
  `SearchBar.tsx` supports arrow-key traversal across trending topics, recents, categories,
  and live autocomplete results, with `Enter` to select and `Escape` to close.
  `EditorialCarousel.tsx` binds `ArrowLeft`/`ArrowRight` to chapter paging globally (guarded
  against stealing focus from text inputs).
- Every "explore this" affordance — timeline connections, discovery cards, Did-You-Know
  "read more" links — routes through the same pattern:
  `router.push(`/results?topic=${encodeURIComponent(title)}`)`. Keep this single navigation
  contract when adding new related-content surfaces.

## Motion

- `framer-motion` spring transitions for carousel/timeline/modal transforms, tuned around
  `stiffness: 350, damping: 25–35` — fast but not snappy/robotic.
- `fadeInUp` CSS keyframe (`animate-fade-in-up`, defined in `globals.css`) is the default
  section-entrance animation across the results page.
- The search bar's focus ring is an animated gradient border
  (`.animated-gradient`, `gradientMove` keyframe, 6s loop) — this is the one place a
  continuously-animating decorative element is intentional; do not add more.
- Small "live" indicators (a pulsing dot next to "Interactive Encyclopedia" on the homepage,
  a pulsing `ArrowRight` after "Next Chapter") use `animate-pulse` sparingly to draw the eye,
  not decoratively.

## Mobile Behavior

Breakpoint is Tailwind's `md:` (768px) throughout. Layouts change shape, not just size:

- `KnowledgeJourney.tsx`: desktop is a two-column "museum timeline" (vertical scrollable list
  + a large detail panel); mobile collapses to a horizontal snap-scroll card row
  (`snap-x snap-mandatory`) with dot indicators.
- `DiscoveryCarousel.tsx`: horizontal scroll-snap at every breakpoint, but card width changes
  — `w-[85%]` on mobile (one card dominant), `sm:w-[48%]` (two), `md:w-[calc(33.33%-16px)]`
  (three).
- `EditorialCarousel.tsx`: desktop shows fixed side arrow buttons; mobile shows inline
  "← Back / Next →" buttons below the slide instead, since the side arrows would sit outside
  the touch-safe content column.

## Visual Consistency Rules

- The eyebrow-then-gradient-headline section header pattern (see Component Hierarchy) must
  not be varied per-section — it is what makes the page read as one documentary rather than
  a stack of unrelated widgets.
- Hairline borders (`border-white/5`) are the only resting-state border; anything brighter is
  reserved for hover/active/focus states.
- Cyan is the single interactive/accent color; violet and blue are background-glow only
  (`.glow-cyan`, `.glow-violet` radial blurs) and should not be used for interactive text or
  borders.
- Any related-topic or navigation affordance must use the shared `router.push` topic-query
  pattern above — do not introduce a second navigation mechanism for "go read about X."

## Things That Should Never Appear in the UI

Per `CLAUDE.md` and the linter's own rule set (`src/lib/knowledge/linter.ts`):

- Generic timeline labels ("Pivotal era", "Significant milestone", "Core changes", "Major
  development") — these currently *do* appear in the committed cache; see
  [`BENCHMARKS.md`](BENCHMARKS.md). They must never reach the rendered page.
- Placeholder text of any kind ("Compiled detail for X", "TBD", "N/A") — also currently
  present in cached artifacts; a module should be hidden entirely rather than render this.
- Raw drop shadows — this design language uses colored glows and hairline borders exclusively.
- **A raw numeric surprise score**, per `CLAUDE.md`'s explicit rule. `FactCards.tsx`
  currently renders `Surprise: {item.surpriseScore}/10` directly — this is a live violation,
  not a hypothetical one, and should be fixed or the score hidden until it is calibrated.
- Any of the 14 orphaned components rendered without a conscious decision to bring back that
  visual language.
