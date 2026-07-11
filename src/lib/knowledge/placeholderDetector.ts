// Single source of truth for "does this text look like machine filler rather
// than real content." Every ingestion boundary in the knowledge pipeline
// (structured facts, knowledge graph, timeline, fact script, trivia,
// related-topic explanations, final validation, cache write) must route
// through this module rather than maintaining its own substring list.
//
// This supersedes the narrow, independently-maintained checks the V17
// forensic audit found in linter.ts (which matched only "placeholder"/
// "tbd"/"n/a" and "significant milestone" specifically, missing the actual
// text the fallback pipeline produced — see reports/audits/V17_FORENSIC_AUDIT.md
// Bugs #9, #12, #13).

const EXACT_PLACEHOLDER_PHRASES = [
  "compiled detail for",
  "pivotal era",
  "significant milestone",
  "core changes",
  "major development",
  "historical importance",
  "topic-specific brief",
  "foundational detail",
  "general overview",
  "notable progression",
  "significant item",
  "placeholder",
  "tbd",
  "n/a",
  "unknown director",
  "unknown founder",
  "details are na",
];

// Looser paraphrases of the same phrases, so a rewording still gets caught.
const SEMANTIC_PLACEHOLDER_PATTERNS: RegExp[] = [
  /\bcompiled\s+(detail|details|data)\s+(for|on|about)\b/i,
  /\bpivotal\s+(era|period|time)\b/i,
  /\b(significant|notable|major|key)\s+(milestone|development|progression|change)s?\b/i,
  /\bunderwent\s+core\s+changes\b/i,
  /\bgeneral(ized)?\s+overview\b/i,
  /\bfoundational\s+detail(s)?\b/i,
  /\btopic[- ]specific\s+brief\b/i,
  /\bsignificant\s+item\s*\d*\b/i,
  /\bhistorical\s+importance\b/i,
];

export function containsPlaceholder(text: string | null | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  for (const phrase of EXACT_PLACEHOLDER_PHRASES) {
    if (lower.includes(phrase)) return true;
  }
  for (const pattern of SEMANTIC_PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

// True only when EVERY string in the array is placeholder-shaped — an array
// with at least one real value alongside filler is not treated as fully
// contaminated (the real value can still be used).
export function isPlaceholderArray(values: unknown): boolean {
  if (!Array.isArray(values) || values.length === 0) return false;
  return values.every((v) => typeof v === "string" && containsPlaceholder(v));
}

export function isPlaceholderValue(value: unknown): boolean {
  if (typeof value === "string") return containsPlaceholder(value);
  if (Array.isArray(value)) return isPlaceholderArray(value);
  return false;
}

export function findPlaceholderPhrases(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const phrase of EXACT_PLACEHOLDER_PHRASES) {
    if (lower.includes(phrase)) found.push(phrase);
  }
  for (const pattern of SEMANTIC_PLACEHOLDER_PATTERNS) {
    const match = text.match(pattern);
    if (match) found.push(match[0]);
  }
  return found;
}

// Recursively scans an arbitrary structured-facts object/array for any
// placeholder-shaped string value. Used at the final validation and
// cache-write boundaries where the whole payload must be swept, not just
// one known field.
export function scanForPlaceholders(value: unknown, path = ""): string[] {
  const hits: string[] = [];
  if (typeof value === "string") {
    if (containsPlaceholder(value)) hits.push(path || "(root)");
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      hits.push(...scanForPlaceholders(item, `${path}[${idx}]`));
    });
    return hits;
  }
  if (value && typeof value === "object") {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      hits.push(...scanForPlaceholders(val, path ? `${path}.${key}` : key));
    }
  }
  return hits;
}

export const PLACEHOLDER_PHRASE_LIST: readonly string[] = EXACT_PLACEHOLDER_PHRASES;
