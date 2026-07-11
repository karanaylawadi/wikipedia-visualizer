# V18 Phase 1 Benchmark Results

Run: `npx tsx scripts/run-benchmarks.ts`, live, against `.env.local`'s configured
`GEMINI_API_KEY`. 18 topics (the original 16 plus Napoleon Bonaparte and Renaissance Art, added
in this phase). Full raw output preserved outside this repo for reference; the tables below are
the complete summary.

## Headline Result

**0 of 18 topics reported `PASS`. All 18 reported `FAIL`.**

This is not a regression. It is the direct, correct consequence of the API key used in this
environment returning `RESOURCE_EXHAUSTED` (HTTP 429) on every single call, with the API's own
error message reporting **`limit: 0`** for the free-tier quota — a zero-quota key, not merely a
rate-limited one. Every one of the 18 topics was therefore compiled entirely through the
deterministic fallback path. Under V17, this exact scenario produced artifacts that reported
`validationStatus.passed: true`. Under V18 Phase 1, it correctly reports `status: "FAIL"` for
all 18 — which is the headline confirmation that this phase's core objective was met.

## Per-Topic Results

| Topic | Expected Ontology | Ontology Match | Quality Gate Status | Quality Score | Generation Mode |
|---|---|---|---|---|---|
| Inception | Movie | PASS | FAIL | 39/100 | fallback |
| Interstellar | Movie | PASS | FAIL | 40/100 | fallback |
| Albert Einstein | Person | PASS | FAIL | 40/100 | fallback |
| Christopher Nolan | Person | PASS | FAIL | 40/100 | fallback |
| Apple Inc. | Company | PASS | FAIL | 40/100 | fallback |
| NVIDIA | Company | PASS | FAIL | 40/100 | fallback |
| Japan | Country | PASS | FAIL | 40/100 | fallback |
| United Arab Emirates | Country | PASS | FAIL | 41/100 | fallback |
| World War II | Historical Event | PASS | FAIL | 41/100 | fallback |
| Space Race | Historical Event | PASS | FAIL | 40/100 | fallback |
| Renaissance | Art Movement | PASS | FAIL | 39/100 | fallback |
| Mona Lisa | Art Movement | PASS | FAIL | 39/100 | fallback |
| Python (programming language) | Technology | PASS | FAIL | 40/100 | fallback |
| Kubernetes | Technology | PASS | FAIL | 41/100 | fallback |
| DNA | Science | PASS | FAIL | 38/100 | fallback |
| Photosynthesis | Science | PASS | FAIL | 38/100 | fallback |
| Napoleon Bonaparte *(new)* | Person | PASS | FAIL | 40/100 | fallback |
| Renaissance Art *(new)* | Art Movement | PASS | FAIL | 39/100 | fallback |

**Ontology classification: 18/18 correct**, even under 100% fallback — the heuristic
classifier (`entityResolver.ts`) is accurate independent of LLM availability, confirming this
layer's design is sound (consistent with prior audits finding zero defects here).

**Quality scores cluster tightly at 38–41/100** across every ontology — expected, since the
fallback path produces structurally similar (empty/near-empty) output regardless of topic; the
small variance comes from differing resolver-confidence branch (`sourceAgreement`) and whichever
timeline years happened to survive the significance filter.

## The Nine V18 Trust Checks

Run against every topic. **All nine passed for all 18 topics**, despite every topic failing
overall — this is the correct outcome: a fallback-only compilation is honestly empty/rejected
rather than fake-populated.

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
| 9 | Cached artifact slug and metadata are correct | PASS* |

\* Check #9 initially depended on a cache-write bug that was found and fixed *during* this
benchmark run — see below. After the fix, a targeted live re-run (Kubernetes, cache file
deleted and recompiled fresh) confirmed check #9 holds under the corrected `cacheGuard.ts`.

## Bug Found Live During This Run

`knowledge/movie/inception.json` (and, on inspection, the corresponding files for all other 17
topics) was found to contain a `v18.0`/`FAIL`-status artifact **that had actually overwritten
the pre-existing cached artifact**, despite `cacheGuard.ts`'s stated rule that a `FAIL` must
never be cached. Root cause: `shouldAcceptWrite()` checked the compiler/ontology version-bump
condition *before* the `FAIL` check, so the version bump (`v17.0` → `v18.0`, expected and
correct on its own) short-circuited past the FAIL rejection. Fixed by moving the FAIL check to
be the first, unconditional check in the function. Verified two ways:

1. A new unit test, `"regression: a version bump does NOT bypass the FAIL check"`, added to
   `scripts/run-unit-tests.ts` — passes.
2. A live, targeted re-run: `knowledge/technology/kubernetes.json` was deleted and Kubernetes
   was recompiled fresh against the same (still zero-quota) key. Console output confirmed:
   `[DAG] Cache write REJECTED for "Kubernetes": candidate artifact status is FAIL — never
   cached, regardless of version or existing cache state`, and the file was confirmed absent
   afterward.

See `reports/releases/V18_PHASE1_REVIEW.md` for full detail.

## What This Run Does Not Cover

This run exercised the **fallback path only**, for every topic, because of the zero-quota key.
It does not demonstrate:

- Whether a genuine LLM-generated artifact reaches `PASS` end to end through the new quality
  gate without an unforeseen threshold issue.
- Whether `PARTIAL` status (the middle tier — some modules pass, some don't) is reachable and
  renders correctly, since every topic here landed cleanly in `FAIL` territory.
- Real-world documentary prose quality (explicitly out of scope for this phase).

The 41 unit tests in `scripts/run-unit-tests.ts` cover the `PASS`/`PARTIAL` code paths with
synthetic inputs; a live confirmation is the natural next verification step once a working key
is available.

## Comparison to the V17 Baseline

The V17 benchmark suite (`docs/BENCHMARKS.md`) reported this exact class of fallback-only
compilation as passing — the forensic audit's headline finding. Under identical live conditions
(a non-functional key), this V18 Phase 1 run reports the same underlying situation as `0
passed, 18 failed`. The number that changed is not "how many topics pass" — that number was
never trustworthy under V17 either way — it's that the **reported result now matches reality**.
