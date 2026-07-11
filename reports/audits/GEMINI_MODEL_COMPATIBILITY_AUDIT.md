# Gemini Model Compatibility Audit

Scope: every reference to a Gemini model name, SDK client construction, or `generateContent`
call in the repository, found by exhaustive grep (`gemini-2.0-flash`, `new GoogleGenAI`,
`.generateContent(`, `GEMINI_API_KEY`) across `src/` and `scripts/`. Written before any code
change, per the task instructions.

## Live, Production-Reachable Call Sites

These are the 9 files actually exercised by `processKnowledgeDAG()` (confirmed reachable from
`src/app/api/analyze/route.ts` and `scripts/run-benchmarks.ts`). All 9 hardcode the literal
string `"gemini-2.0-flash"`, use the `@google/genai` SDK (`ai.models.generateContent(...)`),
and fall back to a deterministic template on any thrown error — the fallback behavior itself
is out of scope for this task (per `docs/V18_MASTER_PLAN.md` / this task's own "do not weaken
any trust gate" instruction) and is unchanged here.

| File | Function | Current Model | API Path | SDK | Error Handling | Fallback Behavior | User-Facing? |
|---|---|---|---|---|---|---|---|
| `src/lib/knowledge/entityResolver.ts` | `resolveEntity()` (2 call sites: pass-1 classification, pass-2 disambiguation) | `"gemini-2.0-flash"` | `ai.models.generateContent` | `@google/genai` | `try/catch`, logs via `console.warn`, no diagnostic recorded (this file never accepted a `diagnostics` param in Phase 1) | `runHeuristicClassification()` — deterministic keyword-based classifier | Yes — every topic goes through entity resolution |
| `src/lib/knowledge/compiler.ts` | `compileKnowledge()` | `"gemini-2.0-flash"` | `ai.models.generateContent` | `@google/genai` | `try/catch`, `StageDiagnostic` pushed on both success and failure | `getFallbackCompilation()` | Yes |
| `src/lib/knowledge/knowledgeGraph.ts` | `buildKnowledgeGraph()` | `"gemini-2.0-flash"` | `ai.models.generateContent` | `@google/genai` | `try/catch`, `StageDiagnostic` pushed | `getFallbackGraph()` | Yes |
| `src/lib/knowledge/factEvaluator.ts` | `evaluateFacts()` | `"gemini-2.0-flash"` | `ai.models.generateContent` | `@google/genai` | `try/catch`, `StageDiagnostic` pushed | `getFallbackEvaluation()` | Yes |
| `src/lib/knowledge/narrativePlanner.ts` | `planNarrative()` | `"gemini-2.0-flash"` | `ai.models.generateContent` | `@google/genai` | `try/catch`, `StageDiagnostic` pushed | `getFallbackPlan()` | Yes |
| `src/lib/knowledge/factScript.ts` | `generateFactScript()` (per-chapter, up to 5 calls) | `"gemini-2.0-flash"` | `ai.models.generateContent` | `@google/genai` | `try/catch`, `StageDiagnostic` pushed | `getFallbackChapterScript()` | Yes |
| `src/lib/knowledge/documentaryWriter.ts` | `writeDocumentarySummary()`, `writeDocumentaryCard()` (2 call sites) | `"gemini-2.0-flash"` | `ai.models.generateContent` | `@google/genai` | `try/catch`, `StageDiagnostic` pushed | `getFallbackSummary()`, `getFallbackCard()` | Yes |
| `src/lib/knowledge/stylePolish.ts` | `polishDocumentary()` (2 call sites: summary polish, per-card polish) | `"gemini-2.0-flash"` | `ai.models.generateContent` | `@google/genai` | `try/catch`, `StageDiagnostic` pushed | No-op (returns unpolished input) | Yes |
| `src/lib/knowledge/diagnostics.ts` | `runStage()` (helper) | `"gemini-2.0-flash"` (module-level `MODEL_NAME` constant) | `ai.models.generateContent` (generic wrapper) | `@google/genai` | Wraps caller's `attempt()` in try/catch | Caller-provided | **No** — confirmed via grep: `runStage()` is never called anywhere in the codebase. Dead code within a live file. |

**Benchmark-only surface:** `scripts/run-benchmarks.ts` does not hardcode a model name itself
— it calls `processKnowledgeDAG()`, so it inherits whichever model the 9 files above use. It
does check `process.env.GEMINI_API_KEY` presence before running at all.

## Duplicate Client Construction

`new GoogleGenAI({ apiKey })` is constructed **fresh, once per function call**, in every one
of the 9 live files above (22 total construction sites across live + dead files) — there is no
shared/pooled client instance anywhere in the codebase. This is not itself a correctness bug
(the SDK is stateless per call), but it is exactly the kind of duplication "centralize model
configuration" exists to close: 9 separate places independently decide the API key, the model
name, and the SDK import.

## Dead Code — Not Modified

These 11 files also contain hardcoded `"gemini-2.0-flash"` references and `new GoogleGenAI(...)`
constructions, but are **confirmed unreachable from any live code path**
(`docs/ARCHITECTURE.md`'s orphaned-code list, `reports/audits/V17_FORENSIC_AUDIT.md`). Per this
task's scope control ("modify only files required for Gemini model configuration... do not
touch unrelated files"), these are documented and **not edited** — updating a model string in
code nothing ever calls would add risk for zero effect:

`src/lib/editorial/classifier.ts`, `timeline.ts`, `summary.ts`, `planner.ts`,
`perspectives.ts`, `retry.ts` (3 call sites), `extractor.ts`, `factAssignment.ts`,
`entityClassifier.ts`, `src/lib/knowledge/geminiWriter.ts` (2 call sites).

## Environment-Variable Model Configuration

**None existed before this task.** The model name was a literal string, not driven by any
environment variable. This task introduces `GEMINI_PRIMARY_MODEL` and `GEMINI_FALLBACK_MODEL`
(see `src/lib/ai/geminiConfig.ts`).

## Tests That Assume a Specific Model

`scripts/run-unit-tests.ts` line 283 contains one mock `StageDiagnostic` fixture with
`model: "gemini-2.0-flash"` hardcoded, used to test `qualityGate.ts`'s fallback-ratio
computation (unrelated to model *selection* — the test only cares that the diagnostic's
`fallbackUsed` flag is `true`). Not a functional dependency on the model name; left as
representative test data, since a model name string here is disconnected from the actual
model-selection logic gated by this task's failing config.

## Root Cause of the `404` Failure

Confirmed live during this audit (`ai.models.generateContent({model: "gemini-2.5-flash", ...})`
and `{model: "gemini-2.0-flash-001", ...}` both tested):

```
404 — "This model models/gemini-2.5-flash is no longer available to new users.
       Please update your code to use a newer model..."
```

The configured API key's project can no longer call **pinned/dated model snapshots** at all
(`gemini-2.0-flash`, `gemini-2.0-flash-001`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` all
return 404 at `generateContent` time). **Critically, `ai.models.list()` still reports
`gemini-2.0-flash` as existing with `generateContent` in its `supportedActions`** — the Models
List API is stale relative to what `generateContent` will actually serve. This means
list-based validation alone (as this task's instructions specify as the primary validation
mechanism) is necessary but **not sufficient** to guarantee a model is truly callable; the
model-selection layer built in this task also treats a live `generateContent`-time 404/"no
longer available" response as an unavailability signal, distinct from other errors, and reacts
to it (see `src/lib/ai/geminiConfig.ts`).

Alias-style model names — `gemini-flash-latest`, `gemini-flash-lite-latest`,
`gemini-pro-latest` — were confirmed live to succeed (`finishReason: "STOP"`, real text
returned) against the same key that rejects every pinned snapshot tested. This is the basis
for this task's default `GEMINI_PRIMARY_MODEL`/`GEMINI_FALLBACK_MODEL` values.

## Two Further Root Causes Found During Live Verification (Post-404-Fix)

Switching to `gemini-flash-latest` resolved the 404s, but the first live 18-topic benchmark
run after the switch still showed **0/18 passing with 16 Gemini-call JSON-parse failures** —
worse-looking than expected for a "fixed" model. Both causes below were confirmed live with a
throwaway probe script (deleted after use) before touching production code, per this task's
"root-cause before patching" standard.

**1. Extended thinking silently consumed the entire output budget.** `gemini-flash-latest`
enables extended thinking by default. Probed live: a call with `maxOutputTokens: 500` returned
`usageMetadata.thoughtsTokenCount: 480`, leaving 16 tokens for the actual JSON body and
`finishReason: "MAX_TOKENS"` — every response was truncated mid-string, regardless of prompt
size. This is why the first post-404-fix benchmark run showed calls "succeeding" (no thrown
error, no 404) yet still producing 100% fallback content: `JSON.parse()` was failing on
truncated text, not on a request error. Fixed centrally in
`callGeminiModel()` (`src/lib/ai/geminiConfig.ts`) by defaulting
`config.thinkingConfig.thinkingBudget` to `0` for every call (a caller-supplied `thinkingConfig`
still overrides). Verified live: the same probe prompt then returned a complete response with
`finishReason: "STOP"` and no `thoughtsTokenCount`.

**2. Two stages had `maxOutputTokens` budgets too small for their own schema, independent of
thinking.** After disabling thinking, `factEvaluator.ts` (`maxOutputTokens: 2000`, evaluating up
to 15 facts × 7 metrics + reasoning each) and `compiler.ts` (`maxOutputTokens: 2500`, the
largest schema — structured facts, timeline, trivia, entities, related topics, source sections)
were still hitting `finishReason: "MAX_TOKENS"` on real prompts (confirmed live:
`candidatesTokenCount: 1996/2000` for factEvaluator). Bumped to `4000` and `6000` respectively,
each verified live against a representative prompt before editing production code
(`finishReason: "STOP"`, budget headroom confirmed). No other stage's budget needed adjustment —
all other call sites were already completing within their existing limits once thinking was
disabled.

**Combined effect, confirmed via the full 18-topic benchmark suite:** Gemini call/JSON-parse
failures dropped from 16 to 0. 10/18 topics now generate on pure primary (LLM) content with zero
fallback (`generationMode: "primary"`); the remaining 8/18 are `"mixed"`. See
`reports/releases/V18_EDITORIAL_QUALITY_BACKLOG.md` for why the benchmark's strict PASS bar
(requires clearing the linter) is still 0/18 despite this — the remaining gap is entirely
pre-existing editorial/linter content-quality rules, not a model-configuration defect.
