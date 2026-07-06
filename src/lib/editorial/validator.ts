import type { PerspectiveCard } from "./perspectives";

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
  "this crucial perspective"
];

const GENERIC_HEADLINES = [
  "overview",
  "history",
  "legacy",
  "importance",
  "summary",
  "background",
  "origins",
  "developments"
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
  otherCards: PerspectiveCard[]
): ValidationResult {
  const errors: string[] = [];
  const words = card.summary.split(/\s+/).filter(Boolean).length;

  if (words < 80 || words > 120) {
    errors.push(`Card ${index + 1} word count of ${words} is outside the required 80-120 range.`);
  }

  const lowerTopic = topic.toLowerCase();
  if (card.summary.toLowerCase().trim().startsWith(lowerTopic)) {
    errors.push(`Card ${index + 1} summary starts directly with the topic name.`);
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

  // Overlap checks
  const cardTokens = cleanAndTokenize(card.summary);
  for (let j = 0; j < otherCards.length; j++) {
    const other = otherCards[j];
    const otherTokens = cleanAndTokenize(other.summary);
    const overlap = getOverlapRatio(cardTokens, otherTokens);
    if (overlap > 0.15) {
      errors.push(`Card ${index + 1} has ${Math.round(overlap * 100)}% factual overlap with Card ${j + 1}, exceeding the 15% threshold.`);
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
  if (facts.length !== 3) {
    errors.push("Exactly 3 surprising facts are required.");
  }
  facts.forEach((fact, i) => {
    const words = fact.split(/\s+/).filter(Boolean).length;
    if (words > 18) {
      errors.push(`Surprising fact ${i + 1} has ${words} words, exceeding the 18-word maximum.`);
    }
  });
  return {
    valid: errors.length === 0,
    errors
  };
}
