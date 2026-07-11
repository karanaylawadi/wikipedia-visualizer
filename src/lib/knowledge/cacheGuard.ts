import type { KnowledgeArtifact } from "@/types/knowledge";

// Cache write protection: a better cached artifact must never be silently
// overwritten by a worse one. Before this module existed, dag.ts's only
// gate was `needsRecompilation && lintReport.passed` — a fresh compile that
// happened to fall back harder than the artifact already on disk could
// still overwrite it, because "passed" was achievable by fallback content
// (V17_FORENSIC_AUDIT.md, headline finding). This is the second half of the
// fix: even when recompilation does happen, the write itself is compared.

export interface CacheDecision {
  accepted: boolean;
  reason: string;
}

export function shouldAcceptWrite(
  existing: KnowledgeArtifact | null,
  candidate: KnowledgeArtifact
): CacheDecision {
  // Absolute, unconditional, checked before anything else — including the
  // version-bump bypass below. A version bump means the old artifact is
  // stale, but staleness never justifies caching a worse replacement.
  // (This exact ordering bug was caught live during Phase 1 benchmarking:
  // a FAIL-status v18 recompile overwrote a cached v17 artifact purely
  // because the version differed, before the FAIL check ever ran — see
  // reports/releases/V18_PHASE1_REVIEW.md.)
  if (candidate.qualityAssessment.status === "FAIL") {
    return { accepted: false, reason: "candidate artifact status is FAIL — never cached, regardless of version or existing cache state" };
  }

  if (!existing) {
    return { accepted: true, reason: "no existing cached artifact for this topic" };
  }

  if (existing.wikipediaRevision !== candidate.wikipediaRevision) {
    return { accepted: true, reason: "source Wikipedia revision changed" };
  }

  if (existing.compilerVersion !== candidate.compilerVersion || existing.ontologyVersion !== candidate.ontologyVersion) {
    return { accepted: true, reason: "compiler or ontology version advanced — old artifact is stale regardless of its prior score" };
  }

  const existingQA = existing.qualityAssessment;
  const candidateQA = candidate.qualityAssessment;

  // Older artifacts written before this module existed have no
  // qualityAssessment at all — treat that as the worst possible score so
  // any honestly-assessed candidate can replace it.
  const existingScore = existingQA?.qualityScore ?? -1;
  const candidateScore = candidateQA.qualityScore;

  if (candidateScore < existingScore) {
    return {
      accepted: false,
      reason: `candidate quality score ${candidateScore} is lower than cached score ${existingScore}`,
    };
  }

  const existingPlaceholders = existingQA?.placeholderCount ?? Number.POSITIVE_INFINITY;
  if (candidateQA.placeholderCount > existingPlaceholders) {
    return {
      accepted: false,
      reason: `candidate has more placeholder contamination (${candidateQA.placeholderCount}) than the cached artifact (${existingPlaceholders})`,
    };
  }

  const existingProvenance = existingQA?.provenanceCoverage ?? 0;
  if (candidateScore === existingScore && candidateQA.provenanceCoverage < existingProvenance) {
    return {
      accepted: false,
      reason: `equal quality score, but candidate provenance coverage (${candidateQA.provenanceCoverage.toFixed(2)}) is lower than cached (${existingProvenance.toFixed(2)})`,
    };
  }

  const existingVerifiedRatio = existingQA?.verifiedFactRatio ?? 0;
  if (candidateScore === existingScore && candidateQA.verifiedFactRatio < existingVerifiedRatio) {
    return {
      accepted: false,
      reason: `equal quality score, but candidate verified-fact ratio (${candidateQA.verifiedFactRatio.toFixed(2)}) is lower than cached (${existingVerifiedRatio.toFixed(2)})`,
    };
  }

  const existingFallbackRatio = existingQA?.fallbackRatio ?? 1;
  if (candidateScore === existingScore && candidateQA.fallbackRatio > existingFallbackRatio) {
    return {
      accepted: false,
      reason: `equal quality score, but candidate used more fallback generation (${candidateQA.fallbackRatio.toFixed(2)}) than cached (${existingFallbackRatio.toFixed(2)})`,
    };
  }

  return { accepted: true, reason: "candidate is equal or better quality than the cached artifact on every compared signal" };
}
