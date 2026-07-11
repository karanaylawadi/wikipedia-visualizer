import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { KnowledgeArtifact } from "@/types/knowledge";
import { createCacheKey } from "../editorial/cache";

const BASE_DIR = path.join(process.cwd(), "knowledge");
// V18 Phase 1 ("Trustworthy Artifact Pipeline"): bumping these two versions
// is the cache-invalidation mechanism for every artifact compiled before
// this phase. All 16 artifacts committed under knowledge/ as of the V17
// forensic audit (reports/audits/V17_FORENSIC_AUDIT.md) were compiler
// version "v17.0" and are now treated as stale on next read — they are
// left on disk as a historical record rather than deleted (see
// reports/releases/V18_PHASE1_IMPLEMENTATION_PLAN.md, Migration Strategy).
export const COMPILER_VERSION = "v18.0";
export const ONTOLOGY_VERSION = "v18.0";
// Separate version dimension so a future change to qualityGate.ts's
// scoring alone (without touching the compiler or ontology) can also force
// recompilation without bumping the other two.
export const QUALITY_GATE_VERSION = "v1.0";

// Normalize ontology name to directory name (e.g. "Historical Event" -> "historical_event")
function getOntologyDirName(ontologyName: string): string {
  return ontologyName.toLowerCase().replace(/\s+/g, "_");
}

export function getArtifactPath(ontologyName: string, topicTitle: string): string {
  const dirName = getOntologyDirName(ontologyName);
  const slug = createCacheKey(topicTitle);
  return path.join(BASE_DIR, dirName, `${slug}.json`);
}

export function loadLocalArtifact(ontologyName: string, topicTitle: string): KnowledgeArtifact | null {
  const filePath = getArtifactPath(ontologyName, topicTitle);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as KnowledgeArtifact;
  } catch (error) {
    console.warn(`[Store] Failed to load local artifact at ${filePath}:`, error);
    return null;
  }
}

export function saveLocalArtifact(artifact: KnowledgeArtifact): void {
  const filePath = getArtifactPath(artifact.ontology.name, artifact.structuredFacts.title || artifact.ontology.labels[0] || "general");
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  try {
    const data = JSON.stringify(artifact, null, 2);
    fs.writeFileSync(filePath, data, "utf-8");
    console.log(`[Store] Successfully saved canonical knowledge artifact at: ${filePath}`);
  } catch (error) {
    console.warn(`[Store] Failed to save local artifact to ${filePath}:`, error);
  }
}

export function calculateChecksum(data: any): string {
  const hash = crypto.createHash("sha256");
  hash.update(typeof data === "string" ? data : JSON.stringify(data));
  return hash.digest("hex");
}

export function calculateDependencyHash(inputs: {
  compilerVersion: string;
  ontologyVersion: string;
  wikipediaRevision: string;
  sourceTextChecksum: string;
  qualityGateVersion?: string;
}): string {
  const combined = `${inputs.compilerVersion}:${inputs.ontologyVersion}:${inputs.wikipediaRevision}:${inputs.sourceTextChecksum}:${inputs.qualityGateVersion || QUALITY_GATE_VERSION}`;
  return crypto.createHash("sha256").update(combined).digest("hex");
}
