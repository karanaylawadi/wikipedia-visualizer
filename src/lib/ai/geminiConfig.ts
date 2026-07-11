// Single source of truth for Gemini model selection. Before this module
// existed, the literal string "gemini-2.0-flash" was hardcoded in 9 live
// pipeline files (see reports/audits/GEMINI_MODEL_COMPATIBILITY_AUDIT.md).
// When that model was deprecated server-side, every one of those 9 files
// would have needed an individual edit. This module exists so a model
// change is one edit, and so an unavailable model produces a recorded,
// diagnosable decision rather than a generic caught exception.
//
// Design note on why this validates via BOTH models.list() and live-call
// failure: this repo's configured API key demonstrated, live, that
// models.list() can report a model as existing with "generateContent" in
// its supportedActions while the generateContent endpoint itself returns
// 404 "no longer available." List-based validation is the primary,
// cheaper check (and is what this task's instructions specify); a live
// 404/NOT_FOUND at call time is treated as an equally valid unavailability
// signal and triggers the same fallback path, because the audit proved
// list-based validation alone is not sufficient.

import type { ContentListUnion } from "@google/genai";

export type ModelErrorCategory =
  | "invalid_model"
  | "unavailable_model"
  | "quota_exhausted"
  | "authentication_failure"
  | "malformed_response"
  | "parser_failure"
  | "safety_rejection"
  | "network_failure"
  | "unknown";

// Minimal structural interface for the parts of the @google/genai client
// this module actually uses. Keeping this narrow (rather than importing
// the SDK's own GoogleGenAI type) is what makes selectModel()/
// callGeminiModel() unit-testable with a plain mock object — no real
// network client or SDK class needed in tests.
export interface GeminiModelInfo {
  name?: string;
  supportedActions?: string[];
}
export interface GeminiListModelsResult {
  page?: GeminiModelInfo[];
}
export interface GeminiClient {
  models: {
    list(params?: { config?: { pageSize?: number } }): Promise<GeminiListModelsResult>;
    generateContent(params: { model: string; contents: ContentListUnion; config?: Record<string, unknown> }): Promise<{
      text?: string;
      candidates?: Array<{ finishReason?: string }>;
    }>;
  };
}

// Confirmed live (see reports/audits/GEMINI_MODEL_COMPATIBILITY_AUDIT.md):
// this key's project can no longer call pinned/dated model snapshots
// (gemini-2.0-flash, gemini-2.0-flash-001, gemini-2.5-flash,
// gemini-2.5-flash-lite all 404 at generateContent time), but the rolling
// "-latest" aliases succeed. Aliases are not guaranteed permanent either —
// see docs/ARCHITECTURE.md's model-selection section — which is exactly
// why this still goes through live validation on every selection rather
// than being trusted blindly forever.
const DEFAULT_PRIMARY_MODEL = "gemini-flash-latest";
const DEFAULT_FALLBACK_MODEL = "gemini-flash-lite-latest";

export const GEMINI_PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL || DEFAULT_PRIMARY_MODEL;
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;

export interface ModelValidation {
  model: string;
  modelValidationAttempted: boolean;
  modelValidationSucceeded: boolean;
  supportedGenerationMethod: boolean;
  reason: string | null;
}

export interface ModelSelection {
  configuredModel: string;
  selectedModel: string | null;
  fallbackModelUsed: boolean;
  primaryValidation: ModelValidation;
  fallbackValidation: ModelValidation | null;
}

// Thrown when neither the primary nor the fallback model passes
// validation. Callers must treat this as a structured provider failure —
// stop primary generation, do not produce a trusted artifact, do not
// cache fallback filler as if it were canonical (per this task's explicit
// instruction; the actual "don't cache" enforcement already lives in
// cacheGuard.ts / qualityGate.ts and is unchanged by this module).
export class ProviderUnavailableError extends Error {
  readonly configuredModel: string;
  readonly primaryValidation: ModelValidation;
  readonly fallbackValidation: ModelValidation | null;
  constructor(configuredModel: string, primaryValidation: ModelValidation, fallbackValidation: ModelValidation | null) {
    super(`No supported Gemini model available (configured primary: "${configuredModel}")`);
    this.name = "ProviderUnavailableError";
    this.configuredModel = configuredModel;
    this.primaryValidation = primaryValidation;
    this.fallbackValidation = fallbackValidation;
  }
}

// Thrown when a model was selected (validation passed) but the actual
// generateContent call still failed. Carries a classified error category
// so callers can build a rich, secret-free diagnostic without each of the
// 9 stage files re-implementing error classification independently.
export class GeminiCallError extends Error {
  readonly category: ModelErrorCategory;
  readonly configuredModel: string;
  readonly selectedModel: string;
  readonly fallbackModelUsed: boolean;
  constructor(message: string, category: ModelErrorCategory, configuredModel: string, selectedModel: string, fallbackModelUsed: boolean) {
    super(message);
    this.name = "GeminiCallError";
    this.category = category;
    this.configuredModel = configuredModel;
    this.selectedModel = selectedModel;
    this.fallbackModelUsed = fallbackModelUsed;
  }
}

function extractStatusCode(message: string): number | null {
  const jsonMatch = message.match(/"code"\s*:\s*(\d+)/);
  if (jsonMatch) return parseInt(jsonMatch[1], 10);
  const bareMatch = message.match(/\b([45]\d{2})\b/);
  return bareMatch ? parseInt(bareMatch[1], 10) : null;
}

// Classifies an error from the SDK into one of the categories this task's
// diagnostics require. Never inspects or logs the API key.
export function classifyModelError(error: unknown): ModelErrorCategory {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const statusCode = extractStatusCode(message);

  if (
    statusCode === 404 ||
    lower.includes("no longer available") ||
    (lower.includes("not_found") && lower.includes("model"))
  ) {
    return "unavailable_model";
  }
  if (statusCode === 400 && lower.includes("model")) {
    return "invalid_model";
  }
  if (statusCode === 429 || lower.includes("resource_exhausted") || lower.includes("quota")) {
    return "quota_exhausted";
  }
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    lower.includes("unauthorized") ||
    lower.includes("permission") ||
    lower.includes("api key not valid") ||
    lower.includes("api_key_invalid")
  ) {
    return "authentication_failure";
  }
  if (lower.includes("safety") || lower.includes("blocked") || lower.includes("recitation")) {
    return "safety_rejection";
  }
  if (lower.includes("json") || lower.includes("unexpected token") || lower.includes("parse")) {
    return "parser_failure";
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("timeout") ||
    lower.includes("abort")
  ) {
    return "network_failure";
  }
  return "unknown";
}

async function checkModelSupportsGenerateContent(client: GeminiClient, modelName: string): Promise<ModelValidation> {
  try {
    const result = await client.models.list({ config: { pageSize: 200 } });
    const models = result.page || [];
    const normalized = modelName.replace(/^models\//, "");
    const found = models.find((m) => (m.name || "").replace(/^models\//, "") === normalized);
    if (!found) {
      return {
        model: modelName,
        modelValidationAttempted: true,
        modelValidationSucceeded: false,
        supportedGenerationMethod: false,
        reason: "model not found in models.list()",
      };
    }
    const supports = (found.supportedActions || []).includes("generateContent");
    return {
      model: modelName,
      modelValidationAttempted: true,
      modelValidationSucceeded: supports,
      supportedGenerationMethod: supports,
      reason: supports ? null : "model exists but does not support generateContent",
    };
  } catch (error) {
    return {
      model: modelName,
      modelValidationAttempted: true,
      modelValidationSucceeded: false,
      supportedGenerationMethod: false,
      reason: `models.list() failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Brief in-memory cache so model validation isn't repeated for every
// stage/request within the same process — per this task's instructions.
// Keyed by configured primary+fallback so a mid-process env change (rare,
// mostly relevant to tests) doesn't serve a stale selection.
let cachedSelection: { key: string; value: ModelSelection; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(): string {
  return `${GEMINI_PRIMARY_MODEL}::${GEMINI_FALLBACK_MODEL}`;
}

export function invalidateModelSelectionCache(): void {
  cachedSelection = null;
}

export async function selectModel(client: GeminiClient): Promise<ModelSelection> {
  const now = Date.now();
  const key = cacheKey();
  if (cachedSelection && cachedSelection.key === key && cachedSelection.expiresAt > now) {
    return cachedSelection.value;
  }

  const primaryValidation = await checkModelSupportsGenerateContent(client, GEMINI_PRIMARY_MODEL);
  let selection: ModelSelection;

  if (primaryValidation.supportedGenerationMethod) {
    selection = {
      configuredModel: GEMINI_PRIMARY_MODEL,
      selectedModel: GEMINI_PRIMARY_MODEL,
      fallbackModelUsed: false,
      primaryValidation,
      fallbackValidation: null,
    };
  } else {
    console.warn(
      `[geminiConfig] Primary model "${GEMINI_PRIMARY_MODEL}" rejected (${primaryValidation.reason}). Trying fallback "${GEMINI_FALLBACK_MODEL}".`
    );
    const fallbackValidation = await checkModelSupportsGenerateContent(client, GEMINI_FALLBACK_MODEL);
    if (fallbackValidation.supportedGenerationMethod) {
      selection = {
        configuredModel: GEMINI_PRIMARY_MODEL,
        selectedModel: GEMINI_FALLBACK_MODEL,
        fallbackModelUsed: true,
        primaryValidation,
        fallbackValidation,
      };
    } else {
      console.error(
        `[geminiConfig] Fallback model "${GEMINI_FALLBACK_MODEL}" also rejected (${fallbackValidation.reason}). No supported Gemini model available.`
      );
      selection = {
        configuredModel: GEMINI_PRIMARY_MODEL,
        selectedModel: null,
        fallbackModelUsed: false,
        primaryValidation,
        fallbackValidation,
      };
    }
  }

  cachedSelection = { key, value: selection, expiresAt: now + CACHE_TTL_MS };
  return selection;
}

export interface GeminiCallMeta {
  configuredModel: string;
  selectedModel: string;
  provider: "gemini";
  modelValidationAttempted: boolean;
  modelValidationSucceeded: boolean;
  supportedGenerationMethod: boolean;
  fallbackModelUsed: boolean;
}

export interface GeminiCallResult {
  response: { text?: string; candidates?: Array<{ finishReason?: string }> };
  meta: GeminiCallMeta;
}

// The single call path every live stage file should use instead of
// constructing `ai.models.generateContent({ model: "<hardcoded>", ... })`
// directly. Selects a validated model, calls it, and — specifically
// because list-based validation was proven insufficient (see module
// header) — retries once against the fallback if the live call itself
// reports the model as unavailable and we were not already on the
// fallback. Never substitutes a model silently: every substitution is
// recorded on the returned meta and logged.
export async function callGeminiModel(
  client: GeminiClient,
  params: { contents: ContentListUnion; config?: Record<string, unknown> }
): Promise<GeminiCallResult> {
  const selection = await selectModel(client);
  if (!selection.selectedModel) {
    throw new ProviderUnavailableError(selection.configuredModel, selection.primaryValidation, selection.fallbackValidation);
  }

  // "-latest" alias models default to extended thinking, which spends the
  // maxOutputTokens budget on internal reasoning before writing the actual
  // response — confirmed live via usageMetadata.thoughtsTokenCount consuming
  // 480 of a 500-token budget and truncating the JSON output mid-string.
  // Every stage here wants a direct structured answer, not chain-of-thought,
  // so thinking is disabled by default; a caller-supplied thinkingConfig
  // still wins via the spread below.
  const attempt = async (modelName: string) => client.models.generateContent({
    model: modelName,
    contents: params.contents,
    config: { thinkingConfig: { thinkingBudget: 0 }, ...params.config },
  });

  try {
    const response = await attempt(selection.selectedModel);
    return {
      response,
      meta: {
        configuredModel: selection.configuredModel,
        selectedModel: selection.selectedModel,
        provider: "gemini",
        modelValidationAttempted: true,
        modelValidationSucceeded: true,
        supportedGenerationMethod: true,
        fallbackModelUsed: selection.fallbackModelUsed,
      },
    };
  } catch (error) {
    const category = classifyModelError(error);
    const alreadyOnFallback = selection.selectedModel === GEMINI_FALLBACK_MODEL;

    if (category === "unavailable_model" && !alreadyOnFallback) {
      console.warn(
        `[geminiConfig] Selected model "${selection.selectedModel}" passed list validation but failed live at generateContent time (${category}). Invalidating cache and retrying once against fallback "${GEMINI_FALLBACK_MODEL}".`
      );
      invalidateModelSelectionCache();
      const fallbackValidation = await checkModelSupportsGenerateContent(client, GEMINI_FALLBACK_MODEL);
      if (fallbackValidation.supportedGenerationMethod) {
        try {
          const response = await attempt(GEMINI_FALLBACK_MODEL);
          return {
            response,
            meta: {
              configuredModel: selection.configuredModel,
              selectedModel: GEMINI_FALLBACK_MODEL,
              provider: "gemini",
              modelValidationAttempted: true,
              modelValidationSucceeded: true,
              supportedGenerationMethod: true,
              fallbackModelUsed: true,
            },
          };
        } catch (fallbackError) {
          throw new GeminiCallError(
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            classifyModelError(fallbackError),
            selection.configuredModel,
            GEMINI_FALLBACK_MODEL,
            true
          );
        }
      }
    }

    throw new GeminiCallError(
      error instanceof Error ? error.message : String(error),
      category,
      selection.configuredModel,
      selection.selectedModel,
      selection.fallbackModelUsed
    );
  }
}

// Test-only reset — exported explicitly (not a side effect of import) so
// production code paths never depend on it.
export function _resetModelSelectionCacheForTests(): void {
  cachedSelection = null;
}
