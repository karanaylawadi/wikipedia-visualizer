import type { ResolvedEntity, PerspectiveCard, StageDiagnostic } from "@/types/knowledge";
import { containsPlaceholder } from "./placeholderDetector";
import { recordFallback, recordGeminiSuccess, recordGeminiFailure } from "./diagnostics";
import { callGeminiModel } from "@/lib/ai/geminiConfig";

export async function polishDocumentary(
  resolved: ResolvedEntity,
  summary: string,
  cards: PerspectiveCard[],
  diagnostics: StageDiagnostic[] = []
): Promise<{ summary: string; cards: PerspectiveCard[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    recordFallback(diagnostics, "stylePolish", "no API key configured");
    return { summary, cards };
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const start = Date.now();
  try {
    // 1. Polish the brief summary
    const summaryPrompt = `You are a Style Editor. Polish this brief summary to improve sentence variation, rhythm, and transitions.
Your job is ONLY to improve flow and readability. Do NOT change any facts, do NOT add new information, and do NOT add any forbidden words or definition starts.

Forbidden words to reject:
framework, ecosystem, protocol, stakeholder, leveraged, methodology, optimization, selected markers, our team, compiled data, industry practitioners, validation, implementation, deployment, core parameters, utilize, accelerating adoption, secondary adaptations, systematic approach, comprehensive analysis, critical infrastructure, dynamic environment, best practices.
Forbidden phrases:
played an important role, served as a foundation, marked a turning point, helped shape, widely recognized, continues to influence, significant milestone, over time, throughout history, across industries.

Original Brief Summary:
"${summary}"

Return a JSON object with:
{
  "polishedSummary": "string"
}
Only return raw JSON. Start with { and end with }. Do not wrap in markdown.`;

    const { response: summaryResponse, meta } = await callGeminiModel(ai, {
      contents: summaryPrompt,
      config: { temperature: 0.15, maxOutputTokens: 500 }
    });

    const summaryText = typeof summaryResponse.text === "string" ? summaryResponse.text.replace(/```json|```/g, "").trim() : "";
    const summaryParsed = JSON.parse(summaryText) as { polishedSummary: string };
    
    // 2. Polish each card
    const polishedCards = [...cards];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardPrompt = `You are a Style Editor. Polish this chapter card's narration paragraph to improve sentence variation, transitions, and rhythm.
Your job is ONLY to improve flow and readability. Keep the exact number of sentences identical. Do NOT change any facts, do NOT add new information, and do NOT add any forbidden words.

Forbidden words to reject:
framework, ecosystem, protocol, stakeholder, leveraged, methodology, optimization, selected markers, our team, compiled data, industry practitioners, validation, implementation, deployment, core parameters, utilize, accelerating adoption, secondary adaptations, systematic approach, comprehensive analysis, critical infrastructure, dynamic environment, best practices.
Forbidden phrases:
played an important role, served as a foundation, marked a turning point, helped shape, widely recognized, continues to influence, significant milestone, over time, throughout history, across industries.

Original Narration:
"${card.summary}"

Return a JSON object with:
{
  "polishedSummary": "string"
}
Only return raw JSON. Start with { and end with }. Do not wrap in markdown.`;

      const { response: cardResponse } = await callGeminiModel(ai, {
        contents: cardPrompt,
        config: { temperature: 0.15, maxOutputTokens: 300 }
      });

      const cardText = typeof cardResponse.text === "string" ? cardResponse.text.replace(/```json|```/g, "").trim() : "";
      const cardParsed = JSON.parse(cardText) as { polishedSummary: string };

      if (cardParsed.polishedSummary) {
        const origSentences = card.summary.split(/(?<=[.!?])\s+/).filter(Boolean);
        const polishedSentences = cardParsed.polishedSummary.split(/(?<=[.!?])\s+/).filter(Boolean);
        
        if (origSentences.length === 6 && polishedSentences.length === 6 && card.provenance && card.provenance.length === 6) {
          const newProvenance = card.provenance.map((p, idx) => ({
            sentence: polishedSentences[idx],
            fact: p.fact
          }));

          polishedCards[i] = {
            ...card,
            summary: cardParsed.polishedSummary,
            provenance: newProvenance
          };
        } else {
          polishedCards[i] = card;
        }
      }
    }

    const finalSummary = containsPlaceholder(summaryParsed.polishedSummary) ? summary : summaryParsed.polishedSummary || summary;
    const finalCards = polishedCards.map((c, i) => (containsPlaceholder(c.summary) ? cards[i] : c));

    recordGeminiSuccess(diagnostics, "stylePolish", meta, Date.now() - start);

    return {
      summary: finalSummary,
      cards: finalCards
    };
  } catch (error) {
    console.warn("polishDocumentary failed, using unpolished drafts", error);
    recordGeminiFailure(diagnostics, "stylePolish", error, Date.now() - start);
    return { summary, cards };
  }
}
