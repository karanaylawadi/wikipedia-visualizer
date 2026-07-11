import type { StageDiagnostic } from "@/types/knowledge";
import {
  GEMINI_PRIMARY_MODEL,
  ProviderUnavailableError,
  GeminiCallError,
  classifyModelError,
  type GeminiCallMeta,
} from "@/lib/ai/geminiConfig";

// Structured, secret-free stage instrumentation. The forensic audit found
// that every pipeline stage silently falls back on any Gemini failure with
// no distinguishable signal from a successful call (V17_FORENSIC_AUDIT.md,
// Bug #3). This module makes that distinction explicit and queryable on the
// artifact itself, without ever logging an API key or a raw request/response
// body.
//
// Model selection, validation, and error classification now live in
// src/lib/ai/geminiConfig.ts (GEMINI_MODEL_COMPATIBILITY_AUDIT.md) — this
// file only provides the small collector helpers every stage uses to
// record its own diagnostic.

export function createDiagnosticsCollector(): StageDiagnostic[] {
  return [];
}

// Records a stage that never attempted a model call at all — no API key
// configured, or a chapter with no real facts to script (see
// narrativePlanner.ts / factScript.ts's insufficientData handling).
export function recordFallback(
  diagnostics: StageDiagnostic[],
  stage: string,
  reason: string
): void {
  diagnostics.push({
    stage,
    provider: "none",
    configuredModel: null,
    selectedModel: null,
    modelValidationAttempted: false,
    modelValidationSucceeded: false,
    supportedGenerationMethod: false,
    requestAttempted: false,
    requestSucceeded: false,
    failureReason: reason,
    errorCategory: null,
    quotaError: false,
    deprecatedOrUnavailableModel: false,
    fallbackModelUsed: false,
    fallbackContentUsed: true,
    durationMs: 0,
  });
}

export function fallbackRatioFromDiagnostics(diagnostics: StageDiagnostic[]): number {
  if (diagnostics.length === 0) return 1;
  const fallbackCount = diagnostics.filter((d) => d.fallbackContentUsed).length;
  return fallbackCount / diagnostics.length;
}

// Records a successful callGeminiModel() result. Used by every live stage
// file instead of hand-building a 15-field object each time — the single
// place that shape is assembled, per this task's "do not scatter" goal.
export function recordGeminiSuccess(
  diagnostics: StageDiagnostic[],
  stage: string,
  meta: GeminiCallMeta,
  durationMs: number,
  fallbackContentUsed = false
): void {
  diagnostics.push({
    stage,
    provider: meta.provider,
    configuredModel: meta.configuredModel,
    selectedModel: meta.selectedModel,
    modelValidationAttempted: meta.modelValidationAttempted,
    modelValidationSucceeded: meta.modelValidationSucceeded,
    supportedGenerationMethod: meta.supportedGenerationMethod,
    requestAttempted: true,
    requestSucceeded: true,
    failureReason: null,
    errorCategory: null,
    quotaError: false,
    deprecatedOrUnavailableModel: false,
    fallbackModelUsed: meta.fallbackModelUsed,
    fallbackContentUsed,
    durationMs,
  });
}

// Records a failed Gemini call — a ProviderUnavailableError (no valid
// model at all), a GeminiCallError (a validated model still failed at
// generateContent time), or any other thrown error. Always results in
// this stage's deterministic content fallback being used, and always
// records exactly why, without ever including the API key.
export function recordGeminiFailure(
  diagnostics: StageDiagnostic[],
  stage: string,
  error: unknown,
  durationMs: number
): void {
  if (error instanceof ProviderUnavailableError) {
    diagnostics.push({
      stage,
      provider: "gemini",
      configuredModel: error.configuredModel,
      selectedModel: null,
      modelValidationAttempted: true,
      modelValidationSucceeded: false,
      supportedGenerationMethod: false,
      requestAttempted: false,
      requestSucceeded: false,
      failureReason: error.message,
      errorCategory: "unavailable_model",
      quotaError: false,
      deprecatedOrUnavailableModel: true,
      fallbackModelUsed: false,
      fallbackContentUsed: true,
      durationMs,
    });
    return;
  }

  if (error instanceof GeminiCallError) {
    diagnostics.push({
      stage,
      provider: "gemini",
      configuredModel: error.configuredModel,
      selectedModel: error.selectedModel,
      modelValidationAttempted: true,
      modelValidationSucceeded: true,
      supportedGenerationMethod: true,
      requestAttempted: true,
      requestSucceeded: false,
      failureReason: error.message,
      errorCategory: error.category,
      quotaError: error.category === "quota_exhausted",
      deprecatedOrUnavailableModel: error.category === "unavailable_model" || error.category === "invalid_model",
      fallbackModelUsed: error.fallbackModelUsed,
      fallbackContentUsed: true,
      durationMs,
    });
    return;
  }

  // A caught error that never reached model selection or the call itself
  // (e.g. a prompt-construction bug) — still classified, still recorded.
  const category = classifyModelError(error);
  diagnostics.push({
    stage,
    provider: "gemini",
    configuredModel: GEMINI_PRIMARY_MODEL,
    selectedModel: null,
    modelValidationAttempted: false,
    modelValidationSucceeded: false,
    supportedGenerationMethod: false,
    requestAttempted: true,
    requestSucceeded: false,
    failureReason: error instanceof Error ? error.message : String(error),
    errorCategory: category,
    quotaError: category === "quota_exhausted",
    deprecatedOrUnavailableModel: category === "unavailable_model" || category === "invalid_model",
    fallbackModelUsed: false,
    fallbackContentUsed: true,
    durationMs,
  });
}
