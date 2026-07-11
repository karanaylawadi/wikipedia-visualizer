# Non-Negotiables

This is the constitution of Visualizer.wiki.

Every future coding session must read this file before making any code changes. It contains
only permanent principles. It contains no implementation details, no roadmap items, no
temporary tasks. Nothing here expires with a release. If a decision elsewhere in `docs/`
ever conflicts with something written here, this document wins.

---

# Product Philosophy

Visualizer.wiki exists to transform trustworthy knowledge into premium interactive
documentaries.

The goal is understanding, not information density.

A page succeeds when a reader understands something they didn't before — not when a page
contains a large quantity of facts, modules, or visual elements.

---

# Editorial Principles

- Never invent facts.
- Never hallucinate chronology.
- Never fabricate relationships.
- Never present uncertainty as certainty.
- Never use placeholder text.
- Never generate content simply to fill space.

Every sentence must teach something.

Every paragraph must answer: **"Why should the reader care?"**

Prefer clarity over sophistication.

Prefer specificity over abstraction.

Prefer storytelling over summarization.

---

# Knowledge Principles

Canonical knowledge is the single source of truth.

The LLM never decides what is true. The LLM only decides how to explain approved facts.

Generation must never bypass the canonical knowledge layer.

Every displayed fact should be traceable back to provenance.

Good artifacts must never be overwritten by weaker ones.

---

# Documentary Principles

Pages should feel like reading:

- National Geographic
- The New York Times
- BBC Future
- The Atlantic
- Apple editorial
- Google Arts & Culture

Not like reading:

- Wikipedia
- ChatGPT
- Corporate reports
- Research papers

Every chapter must have a purpose.

Every transition must feel natural.

---

# UI Principles

Typography is more important than decoration.

Whitespace improves understanding.

Motion supports reading.

Never distract the reader.

- Avoid unnecessary dashboards.
- Avoid dense card grids.
- Avoid excessive glow.
- Avoid visual clutter.

Every section should feel calm.

---

# Did You Know Principles

Did You Know is the signature feature.

Every fact should be:

- surprising
- memorable
- specific
- short
- worth sharing

Definitions are not trivia.

Coordinates are not trivia.

Population counts are not trivia.

Opening paragraphs are not trivia.

---

# Timeline Principles

Every event must be real.

Every event must have a real date.

Every event must have a real name.

Never invent timeline labels.

If fewer than three real events exist, hide the timeline.

---

# Related Topics Principles

Every recommendation must have a semantic reason.

Always explain the relationship.

Never recommend topics because they belong to the same ontology only.

---

# Engineering Principles

Architecture is more important than prompts.

Deterministic systems are preferred over repeated prompting.

Validation is preferred over retries.

Canonical knowledge is preferred over raw LLM output.

Every module should have one responsibility.

Small composable modules are preferred.

---

# Release Principles

Never ship known placeholder content.

Never ship failing benchmarks.

Never ship content that would embarrass a human editor.

If quality is uncertain: hide the module.

Do not fake quality.

---

# Final Rule

If a feature cannot be implemented at documentary quality, it should not appear in the
product.
