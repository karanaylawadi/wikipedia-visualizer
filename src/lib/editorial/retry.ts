import { validateSummary, validateCard, validateDidYouKnow } from "./validator";
import type { TopicKnowledge } from "@/types/wiki";
import type { CardPlan } from "./planner";
import { generatePerspectiveCard, PerspectiveCard, getDomainCardPrompt } from "./perspectives";
import { generateEditorialBrief, getDomainSummaryPrompt } from "./summary";
import { curateSurprisingFacts } from "./factsCurator";
import { setCachedStage } from "./cache";

export async function retrySummary(
  topicKey: string,
  knowledge: TopicKnowledge
): Promise<string> {
  let summary = await generateEditorialBrief(topicKey, knowledge);
  let validation = validateSummary(summary, knowledge.common.title);
  
  if (validation.valid) {
    return summary;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return summary;

  let attempts = 0;
  let feedback = validation.errors.join("\n");

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    while (attempts < 2 && !validation.valid) {
      attempts++;
      const basePrompt = getDomainSummaryPrompt(knowledge);
      const prompt = `${basePrompt}

PREVIOUS ATTEMPT ERRORS:
${feedback}

Please revise the previous brief summary text to fix the errors listed above while maintaining the category, guidelines, and word count constraints. Only output the revised JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.35, maxOutputTokens: 300 },
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      try {
        const parsed = JSON.parse(text) as { shortSummary: string };
        summary = parsed.shortSummary || summary;
        validation = validateSummary(summary, knowledge.common.title);
        if (validation.valid) {
          await setCachedStage(topicKey, "summary", parsed);
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
  knowledge: TopicKnowledge,
  assignedFacts: { facts: string[]; anchors: string[] },
  factsAlreadyUsed: string,
  otherCards: PerspectiveCard[]
): Promise<PerspectiveCard> {
  let card = await generatePerspectiveCard(topicKey, cardIndex, cardPlan, knowledge, assignedFacts, factsAlreadyUsed);
  let validation = validateCard(card, cardIndex, knowledge.common.title, otherCards, assignedFacts.anchors, knowledge.entityType);

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
      const basePrompt = getDomainCardPrompt(knowledge, cardPlan, assignedFacts, factsAlreadyUsed);
      const prompt = `${basePrompt}

PREVIOUS ATTEMPT ERRORS:
${feedback}

Please revise the previous chapter card text to fix the errors listed above while maintaining all constraints. Only output the revised JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.35, maxOutputTokens: 400 },
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      try {
        const parsed = JSON.parse(text) as PerspectiveCard;
        validation = validateCard(parsed, cardIndex, knowledge.common.title, otherCards, assignedFacts.anchors, knowledge.entityType);
        if (validation.valid) {
          card = parsed;
          await setCachedStage(topicKey, `chapter-${cardIndex}`, parsed);
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
  knowledge: TopicKnowledge
): Promise<string[]> {
  let facts = await curateSurprisingFacts(topicKey, knowledge);
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
      const prompt = `You are a Fact Curator. Refine these five surprising, highly memorable facts about "${knowledge.common.title}".
Original facts to refine:
${facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

PREVIOUS ATTEMPT ERRORS:
${feedback}

Requirements:
1. Return exactly five facts.
2. Each fact must be under 18 words (strict maximum 17 words).
3. Facts must be highly memorable, surprising, and shareable trivia. Reject obvious statements.

Return valid JSON with schema:
{
  "didYouKnow": [
    "Fact 1 under 18 words",
    "Fact 2 under 18 words",
    "Fact 3 under 18 words",
    "Fact 4 under 18 words",
    "Fact 5 under 18 words"
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
