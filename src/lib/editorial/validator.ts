import type { PerspectiveCard } from "@/types/knowledge";

const FORBIDDEN_AI_PHRASES = [
  "this topic",
  "this article",
  "this perspective",
  "represents",
  "illustrates",
  "highlights",
  "demonstrates",
  "trajectory",
  "conceptual",
  "thematic",
  "historical significance",
  "key milestone",
  "important because",
  "notably",
  "as such",
  "in conclusion",
  "overall",
  "furthermore",
  "additionally",
  "this crucial perspective",
  "played an important role",
  "remains significant",
  "influenced many",
  "continues today",
  "marked a turning point",
  "framework",
  "ecosystem",
  "protocol",
  "stakeholder",
  "leveraged",
  "methodology",
  "optimization",
  "selected markers",
  "our team",
  "compiled data",
  "industry practitioners",
  "validation",
  "implementation",
  "deployment",
  "core parameters",
  "utilize",
  "accelerating adoption",
  "secondary adaptations",
  "systematic approach",
  "comprehensive analysis",
  "critical infrastructure",
  "dynamic environment",
  "best practices",
  "served as a foundation",
  "helped shape",
  "widely recognized",
  "continues to influence",
  "significant milestone",
  "over time",
  "throughout history",
  "across industries",
  "centering upon",
  "these observations",
  "compiled data reveals",
  "this establishes",
  "mechanism",
  "therefore",
  "collectively"
];

const GENERIC_HEADLINES = [
  "overview",
  "history",
  "legacy",
  "importance",
  "summary",
  "background",
  "origins",
  "developments",
  "dynamics",
  "evolution",
  "significance",
  "rise",
  "peak",
  "challenges",
  "need",
  "invention",
  "adoption",
  "impact",
  "future",
  "founding",
  "growth",
  "competition",
  "key characteristics",
  "masterpieces",
  "spread",
  "purpose",
  "structure",
  "major campaigns",
  "future vision",
  "story",
  "production",
  "release",
  "reception",
  "introduction",
  "conclusion"
];

function cleanAndTokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function getOverlapRatio(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  if (set1.size === 0 || set2.size === 0) return 0;
  let intersectionCount = 0;
  for (const token of set1) {
    if (set2.has(token)) {
      intersectionCount++;
    }
  }
  const minSize = Math.min(set1.size, set2.size);
  return intersectionCount / minSize;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSummary(summary: string, topic: string): ValidationResult {
  const errors: string[] = [];
  const words = summary.split(/\s+/).filter(Boolean).length;

  if (words < 120 || words > 150) {
    errors.push(`Summary word count of ${words} is outside the required 120-150 range.`);
  }

  const lowerSummary = summary.toLowerCase().trim();
  const lowerTopic = topic.toLowerCase().trim();

  const roboticStarts = [
    `${lowerTopic} is`,
    `${lowerTopic} was`,
    `the ${lowerTopic} is`,
    `the ${lowerTopic} was`,
    `${lowerTopic} has been`
  ];

  if (roboticStarts.some(start => lowerSummary.startsWith(start))) {
    errors.push(`Summary starts with robotic definition phrase.`);
  }

  if (FORBIDDEN_AI_PHRASES.some(phrase => lowerSummary.includes(phrase))) {
    errors.push("Summary contains forbidden AI phrases.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateCard(
  card: PerspectiveCard,
  index: number,
  topic: string,
  otherCards: PerspectiveCard[],
  assignedAnchors?: string[],
  entityType?: string
): ValidationResult {
  const errors: string[] = [];
  const words = card.summary.split(/\s+/).filter(Boolean).length;

  if (words < 70 || words > 95) {
    errors.push(`Card ${index + 1} word count of ${words} is outside the required 70-90 range (strict max 95).`);
  }

  const lowerTopic = topic.toLowerCase();
  const lowerCardSummary = card.summary.toLowerCase().trim();
  if (lowerCardSummary.startsWith(lowerTopic)) {
    errors.push(`Card ${index + 1} summary starts directly with the topic name.`);
  }

  const roboticStarts = [
    `${lowerTopic} is`,
    `${lowerTopic} was`,
    `the ${lowerTopic} is`,
    `the ${lowerTopic} was`,
    `${lowerTopic} has been`
  ];
  if (roboticStarts.some(start => lowerCardSummary.startsWith(start))) {
    errors.push(`Card ${index + 1} summary starts with robotic definition phrase.`);
  }

  const headlineLower = card.title.toLowerCase().trim();
  if (GENERIC_HEADLINES.includes(headlineLower)) {
    errors.push(`Card ${index + 1} title "${card.title}" is generic.`);
  }

  const titleWords = card.title.split(/\s+/).filter(Boolean).length;
  if (titleWords > 5) {
    errors.push(`Card ${index + 1} title has ${titleWords} words, exceeding the 5-word maximum.`);
  }

  if (FORBIDDEN_AI_PHRASES.some(phrase => card.summary.toLowerCase().includes(phrase))) {
    errors.push(`Card ${index + 1} contains forbidden AI phrases.`);
  }

  // Ontology specific validation
  if (entityType) {
    if (entityType === "Movie" || entityType === "TV Series") {
      if (lowerCardSummary.includes("long before the movie") || lowerCardSummary.includes("long before the film")) {
        errors.push(`Card ${index + 1} uses forbidden historical preamble: "Long before the..."`);
      }
    } else {
      if (lowerCardSummary.includes("protagonist") || lowerCardSummary.includes("character arc") || lowerCardSummary.includes("plotline")) {
        errors.push(`Card ${index + 1} contains narrative terms like "protagonist" but is not a creative entity.`);
      }
    }

    if (entityType !== "Country" && entityType !== "City") {
      if (lowerCardSummary.includes("geopolitical landscape") || lowerCardSummary.includes("bordering nations")) {
        errors.push(`Card ${index + 1} contains geopolitical terms but is not a country or city.`);
      }
    }

    if (entityType !== "Person" && entityType !== "Musical Artist") {
      if (lowerCardSummary.includes("early childhood") || lowerCardSummary.includes("biographical trajectory") || lowerCardSummary.includes("his early life") || lowerCardSummary.includes("her early life")) {
        errors.push(`Card ${index + 1} contains biographical personal terms but is not a biography.`);
      }
    }
  }

  // Anchor validation
  if (assignedAnchors && assignedAnchors.length >= 2) {
    let foundCount = 0;
    for (const anchor of assignedAnchors) {
      if (lowerCardSummary.includes(anchor.toLowerCase())) {
        foundCount++;
      }
    }
    if (foundCount < 2) {
      errors.push(`Card ${index + 1} summary does not mention at least two assigned concrete anchors. Assigned anchors: ${assignedAnchors.join(", ")}. Found: ${foundCount}`);
    }
  }

  // Deduplicate sentence check
  const getSentences = (text: string) => text.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  const cardSentences = getSentences(card.summary);
  for (let j = 0; j < otherCards.length; j++) {
    const other = otherCards[j];
    const otherSentences = getSentences(other.summary);
    for (const s of cardSentences) {
      if (otherSentences.includes(s)) {
        errors.push(`Card ${index + 1} shares a duplicate sentence with Card ${j + 1}: "${s}"`);
      }
    }
  }

  // Overlap checks
  const cardTokens = cleanAndTokenize(card.summary);
  for (let j = 0; j < otherCards.length; j++) {
    const other = otherCards[j];
    const otherTokens = cleanAndTokenize(other.summary);
    const overlap = getOverlapRatio(cardTokens, otherTokens);
    if (overlap > 0.10) {
      errors.push(`Card ${index + 1} has ${Math.round(overlap * 100)}% factual overlap with Card ${j + 1}, exceeding the 10% threshold.`);
    }

    if (other.title.toLowerCase().trim() === headlineLower) {
      errors.push(`Card ${index + 1} title duplicates Card ${j + 1}.`);
    }

    if (other.readerQuestion.toLowerCase().trim() === card.readerQuestion.toLowerCase().trim()) {
      errors.push(`Card ${index + 1} reader question duplicates Card ${j + 1}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDidYouKnow(facts: string[]): ValidationResult {
  const errors: string[] = [];
  if (facts.length !== 5) {
    errors.push("Exactly 5 surprising facts are required.");
  }
  facts.forEach((fact, i) => {
    const words = fact.split(/\s+/).filter(Boolean).length;
    if (words >= 18) {
      errors.push(`Surprising fact ${i + 1} has ${words} words, which is 18 or more words.`);
    }
  });
  return {
    valid: errors.length === 0,
    errors
  };
}
