import { validateSummary, validateCard, validateDidYouKnow } from "./validator";
import type { StructuredFacts } from "./facts";
import type { Classification } from "./classifier";
import type { CardPlan } from "./planner";
import { generatePerspectiveCard, PerspectiveCard } from "./perspectives";
import { generateEditorialBrief } from "./summary";
import { curateSurprisingFacts } from "./factsCurator";
import { setCachedStage } from "./cache";

export async function retrySummary(
  topicKey: string,
  structuredFacts: StructuredFacts,
  classification: Classification
): Promise<string> {
  let summary = await generateEditorialBrief(topicKey, structuredFacts, classification);
  let validation = validateSummary(summary, structuredFacts.title);
  
  if (validation.valid) {
    return summary;
  }

  // If first call failed validation (e.g. cached stale values or direct generation edge cases), try with retry loop
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return summary;

  let attempts = 0;
  let feedback = validation.errors.join("\n");

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    while (attempts < 2 && !validation.valid) {
      attempts++;
      const prompt = `You are a Senior Editor. Rewrite the editorial brief for:
Topic: ${structuredFacts.title}
Subtitle: ${structuredFacts.subtitle}
Lead: ${structuredFacts.leadParagraph}
Category: ${classification.category}

PREVIOUS ATTEMPT ERRORS:
${feedback}

Requirements:
1. Word count: 120-150 words.
2. First sentence must state immediately why the topic matters.
3. No robotic definition starts like "X is..." or "The X was...".
4. Do not use forbidden phrases: represents, illustrates, highlights, demonstrates, trajectory, conceptual, thematic, in conclusion, overall, furthermore, additionally.

Return valid JSON with schema:
{ "shortSummary": "Polished text" }
Do not return markdown wrappers.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.35, maxOutputTokens: 300 },
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      try {
        const parsed = JSON.parse(text) as { shortSummary: string };
        summary = parsed.shortSummary || summary;
        validation = validateSummary(summary, structuredFacts.title);
        if (validation.valid) {
          await setCachedStage(topicKey, "stage5-brief", parsed);
          break;
        }
        feedback = validation.errors.join("\n");
      } catch {
        feedback = "Invalid JSON returned. Please start with { and end with }.";
      }
    }
  } catch (err) {
    console.warn("Failed summary retry loop", err);
  }

  return summary;
}

export async function retryCard(
  topicKey: string,
  cardIndex: number,
  cardPlan: CardPlan,
  structuredFacts: StructuredFacts,
  factsAlreadyUsed: string,
  otherCards: PerspectiveCard[]
): Promise<PerspectiveCard> {
  let card = await generatePerspectiveCard(topicKey, cardIndex, cardPlan, structuredFacts, factsAlreadyUsed);
  let validation = validateCard(card, cardIndex, structuredFacts.title, otherCards);

  if (validation.valid) {
    return card;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return card;

  let attempts = 0;
  let feedback = validation.errors.join("\n");

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    while (attempts < 2 && !validation.valid) {
      attempts++;
      const prompt = `You are a Magazine Writer. Rewrite perspective card ${cardIndex + 1} for:
Topic: ${structuredFacts.title}
Perspective Title: ${cardPlan.perspectiveTitle}
Perspective Label: ${cardPlan.referenceLabel}
Reader Question: ${cardPlan.readerQuestion}
Facts to include: ${cardPlan.factsToUse}
Facts to avoid: ${cardPlan.factsToAvoid}

PREVIOUS ATTEMPT ERRORS:
${feedback}

Factual Overlap Prevention (Do not repeat these details):
${factsAlreadyUsed || "No details written yet."}

Requirements:
1. Summary must be 80-100 words (strict maximum 120 words).
2. Title must be a creative magazine headline (max 5 words). Do not use generic titles.
3. No robotic definition starts or forbidden AI phrases.
4. Key takeaway must be under 18 words.

Return valid JSON with schema:
{
  "title": "Headline, 2-5 words",
  "referenceLabel": "Label",
  "readerQuestion": "Reader question answered",
  "summary": "Card text (80-100 words)",
  "keyTakeaway": "Takeaway sentence (max 18 words)"
}
Do not return markdown wrappers.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.35, maxOutputTokens: 400 },
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      try {
        const parsed = JSON.parse(text) as PerspectiveCard;
        validation = validateCard(parsed, cardIndex, structuredFacts.title, otherCards);
        if (validation.valid) {
          card = parsed;
          await setCachedStage(topicKey, `stage4-card-${cardIndex}`, parsed);
          break;
        }
        feedback = validation.errors.join("\n");
      } catch {
        feedback = "Invalid JSON returned. Please start with { and end with }.";
      }
    }
  } catch (err) {
    console.warn("Failed card retry loop", err);
  }

  return card;
}

export async function retryDidYouKnow(
  topicKey: string,
  structuredFacts: StructuredFacts
): Promise<string[]> {
  let facts = await curateSurprisingFacts(topicKey, structuredFacts);
  let validation = validateDidYouKnow(facts);

  if (validation.valid) {
    return facts;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return facts;

  let attempts = 0;
  let feedback = validation.errors.join("\n");

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    while (attempts < 2 && !validation.valid) {
      attempts++;
      const prompt = `You are a Fact Curator. Generate exactly three surprising, memorable, and independently verifiable facts about the topic.
Topic: ${structuredFacts.title}

PREVIOUS ATTEMPT ERRORS:
${feedback}

Requirements:
1. Return exactly three facts.
2. Each fact must be under 18 words.
3. Facts should make readers smile.

Return valid JSON with schema:
{
  "didYouKnow": [
    "Fact 1 under 18 words",
    "Fact 2 under 18 words",
    "Fact 3 under 18 words"
  ]
}
Do not return markdown wrappers.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.4, maxOutputTokens: 250 },
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      try {
        const parsed = JSON.parse(text) as { didYouKnow: string[] };
        const newFacts = parsed.didYouKnow || [];
        validation = validateDidYouKnow(newFacts);
        if (validation.valid) {
          facts = newFacts;
          await setCachedStage(topicKey, "stage6-didyouknow", parsed);
          break;
        }
        feedback = validation.errors.join("\n");
      } catch {
        feedback = "Invalid JSON returned. Please start with { and end with }.";
      }
    }
  } catch (err) {
    console.warn("Failed didYouKnow retry loop", err);
  }

  return facts;
}
