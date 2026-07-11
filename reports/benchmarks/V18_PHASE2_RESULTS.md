# V18 Phase 2 Benchmark Results

Run: `npx tsx scripts/run-benchmarks.ts`, live, against `.env.local`'s configured
`GEMINI_API_KEY`, after both the model-selection fix and the two follow-up fixes described in
`reports/releases/V18_PHASE2_GEMINI_COMPATIBILITY_REVIEW.md`. 18 topics (same set as Phase 1).

## Headline Result

**0 of 18 topics reported `PASS`. All 18 reported `PARTIAL`.**

This is a fundamentally different result from Phase 1's `0/18, all FAIL`. Every topic now
generates substantive, mostly-primary (LLM), non-fallback content (quality scores 91–98/100,
versus Phase 1's 38–41/100 fallback-only scores). Zero Gemini calls failed or produced
unparseable JSON in this run. What is blocking `PASS` is exclusively the linter's
content-quality rules — see `reports/releases/V18_EDITORIAL_QUALITY_BACKLOG.md` for the full
per-topic, per-rule breakdown.

## Per-Topic Results

| Topic | Expected Ontology | Ontology Match | Quality Gate Status | Quality Score | Generation Mode |
|---|---|---|---|---|---|
| Inception | Movie | PASS | PARTIAL | 98/100 | primary |
| Interstellar | Movie | PASS | PARTIAL | 94/100 | mixed |
| Albert Einstein | Person | PASS | PARTIAL | 94/100 | mixed |
| Christopher Nolan | Person | PASS | PARTIAL | 95/100 | mixed |
| Apple Inc. | Company | PASS | PARTIAL | 96/100 | mixed |
| NVIDIA | Company | PASS | PARTIAL | 93/100 | mixed |
| Japan | Country | PASS | PARTIAL | 97/100 | mixed |
| United Arab Emirates | Country | PASS | PARTIAL | 98/100 | primary |
| World War II | Historical Event | PASS | PARTIAL | 97/100 | primary |
| Space Race | Historical Event | PASS | PARTIAL | 98/100 | primary |
| Renaissance | Art Movement | **FAIL** (resolved as Historical Event) | PARTIAL | 96/100 | primary |
| Mona Lisa | Art Movement | PASS | PARTIAL | 97/100 | primary |
| Python (programming language) | Technology | PASS | PARTIAL | 97/100 | primary |
| Kubernetes | Technology | PASS | PARTIAL | 96/100 | mixed |
| DNA | Science | PASS | PARTIAL | 91/100 | primary |
| Photosynthesis | Science | PASS | PARTIAL | 97/100 | primary |
| Napoleon Bonaparte | Person | PASS | PARTIAL | 94/100 | mixed |
| Renaissance Art | Art Movement | PASS | PARTIAL | 96/100 | primary |

**Ontology classification: 17/18 correct.** The one mismatch ("Renaissance" → `Historical Event`
instead of the benchmark's expected `Art Movement`) is a genuine ambiguity — "Renaissance" alone
is defensibly a historical period, while the separate topic "Renaissance Art" correctly resolves
to `Art Movement`. Not a regression from this phase; flagged for a resolver-logic or
benchmark-expectation decision, out of scope here.

**Generation mode: 10/18 fully `primary` (zero fallback anywhere in the artifact), 8/18
`mixed`** (at least one stage fell back, typically a single occasional live hiccup, not a
systemic failure — see the backlog doc for which stage per topic).

## The Nine V18 Trust Checks

Run against every topic. **All nine passed for all 18 topics** — the trust architecture built in
Phase 1 continues to hold under real, mostly-primary content, not just under the all-fallback
conditions Phase 1 could only test with a broken key.

| # | Trust Check | Result (18/18) |
|---|---|---|
| 1 | No placeholder strings | PASS |
| 2 | Confidence is not hardcoded | PASS |
| 3 | Fallback artifacts cannot report PASS | PASS |
| 4 | Provenance coverage meets threshold for its status | PASS |
| 5 | No placeholder graph nodes | PASS |
| 6 | No incomplete truncated facts | PASS |
| 7 | Timelines contain named source-supported events (or are hidden) | PASS |
| 8 | Failed modules are omitted with a documented reason | PASS |
| 9 | Cached artifact slug and metadata are correct | PASS |

## Why 0/18 Still Fails the Linter

A topic only counts as `PASS` in this benchmark if `isOntologyCorrect && lintReport.passed &&
allTrustChecksPassed` (`scripts/run-benchmarks.ts`). All three of the fixes in this phase
addressed the *model* layer, and they worked: the trust checks and quality-gate scores prove
the content is now real and substantive. The linter is a stricter, independent gate on editorial
craft (sentence-provenance tagging density, phrase repetition across chapters, paragraph length,
chronological ordering, per-ontology field completeness) that this phase's instructions
explicitly excluded from scope. Full breakdown: `reports/releases/V18_EDITORIAL_QUALITY_BACKLOG.md`.

## Comparison to Phase 1

| | Phase 1 (zero-quota key) | Phase 2, mid-fix (model switched, thinking on) | Phase 2 final |
|---|---|---|---|
| Gemini call/parse failures | 100% of calls | 16 of ~162 call sites | 0 |
| `generationMode` | 18/18 `fallback` | mostly `fallback`/`mixed` | 10/18 `primary`, 8/18 `mixed` |
| Quality score range | 38–41/100 | 79–99/100 | 91–98/100 |
| Quality Gate status | 18/18 `FAIL` | mostly `PARTIAL` | 18/18 `PARTIAL` |
| Benchmark `PASS` | 0/18 | 0/18 | 0/18 |

The `PASS` count has not moved, and per Phase 1's own review ("a pass count alone is not
sufficient"), that number was never the right thing to optimize blindly. What moved is the
substance underneath it: this phase converted every topic from dishonest-looking-fine (V17) /
honestly-empty (Phase 1, forced by a broken key) into honestly-substantive-but-not-yet-polished —
the correct intermediate state for a codebase whose next milestone is editorial quality, not
provider compatibility.
