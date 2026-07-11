import type { ResolvedEntity, FactScript, FactScriptChapter, PerspectiveCard, StageDiagnostic } from "@/types/knowledge";
import { containsPlaceholder } from "./placeholderDetector";
import { cleanFragment } from "./sentenceCleaner";
import { recordFallback, recordGeminiSuccess, recordGeminiFailure } from "./diagnostics";
import { callGeminiModel } from "@/lib/ai/geminiConfig";

export async function writeDocumentarySummary(
  resolved: ResolvedEntity,
  script: FactScript,
  diagnostics: StageDiagnostic[] = []
): Promise<{ summary: string; provenance: Array<{ sentence: string; fact: string }> }> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Flatten keyFacts for summary reference. Chapters with no real facts
  // (insufficientData) contribute nothing rather than a placeholder line.
  const allFacts: string[] = [];
  script.chapters.forEach((ch, chIdx) => {
    if (ch.insufficientData) return;
    ch.keyFacts.forEach((fact) => {
      if (containsPlaceholder(fact)) return;
      allFacts.push(`[Fact ${allFacts.length + 1}] Chapter ${chIdx + 1}: ${fact}`);
    });
  });

  if (!apiKey) {
    recordFallback(diagnostics, "documentaryWriter.summary", "no API key configured");
    return getFallbackSummary(resolved, script);
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a Senior Editor at National Geographic and The New York Times.
Your job is ONLY to convert the approved factual bullets in the Fact Script into a flowing, premium introductory summary (exactly 100 to 125 words).

Do NOT perform external research or infer facts. Every sentence must be directly supported by exactly one fact in the list below.
Avoid abstract language, corporate buzzwords, and AI filler phrases. Emulate high-end editorial journalism.

Writing Rules:
1. Start the paragraph with a concrete date, person, place, or entity. Never start with abstract intros (e.g. "Examining foundational developments...").
2. Prefer short, punchy sentences. Sentences should average 15-20 words. Mix sentence lengths for natural rhythm.
3. Every sentence must have exactly one [Fact X] tag mapping to its source fact.
4. Eliminate all filler. If a sentence adds nothing, delete it.

Forbidden words to reject:
framework, ecosystem, protocol, stakeholder, leveraged, methodology, optimization, selected markers, our team, compiled data, industry practitioners, validation, implementation, deployment, core parameters, utilize, accelerating adoption, secondary adaptations, systematic approach, comprehensive analysis, critical infrastructure, dynamic environment, best practices, centering upon, these observations, compiled data reveals, this establishes, mechanism, therefore, collectively.

Forbidden phrases:
played an important role, served as a foundation, marked a turning point, helped shape, widely recognized, continues to influence, significant milestone, over time, throughout history, across industries.

FACT LIST:
${allFacts.join("\n")}

You MUST trace sentence provenance. At the end of every sentence, append the exact fact key that supports it, e.g. "Sentence text here [Fact 1]." or "Another sentence here [Fact 2]."

Return a JSON object with:
{
  "summary": "Narration text (100-125 words) with [Fact X] tags."
}
Only return raw JSON. Start with { and end with }. Do not wrap in markdown.`;

  const start = Date.now();
  try {
    const { response, meta } = await callGeminiModel(ai, {
      contents: prompt,
      config: { temperature: 0.15, maxOutputTokens: 500 }
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { summary: string };
    const processed = parseProvenanceAndClean(parsed.summary, allFacts);
    const wordCount = processed.summary.split(/\s+/).filter(Boolean).length;

    if (wordCount >= 80 && !containsPlaceholder(processed.summary)) {
      recordGeminiSuccess(diagnostics, "documentaryWriter.summary", meta, Date.now() - start);
      return processed;
    }
    recordGeminiSuccess(diagnostics, "documentaryWriter.summary", meta, Date.now() - start, true);
  } catch (error) {
    console.warn("writeDocumentarySummary failed, using fallback", error);
    recordGeminiFailure(diagnostics, "documentaryWriter.summary", error, Date.now() - start);
  }

  return getFallbackSummary(resolved, script);
}

// Returns null when a chapter cannot be honestly written — the caller
// (dag.ts) drops that chapter from the final card list rather than
// rendering a filled-in placeholder (V17_FORENSIC_AUDIT.md, Japan chapter
// 5: a chapter built entirely from a fact-free template).
export async function writeDocumentaryCard(
  resolved: ResolvedEntity,
  chapterScript: FactScriptChapter,
  cardIndex: number,
  otherCards: PerspectiveCard[],
  diagnostics: StageDiagnostic[] = []
): Promise<PerspectiveCard | null> {
  if (chapterScript.insufficientData || !chapterScript.cause || !chapterScript.effect || !chapterScript.takeaway || chapterScript.keyFacts.length === 0) {
    recordFallback(diagnostics, "documentaryWriter.card", "chapter has no real cause/effect/facts to write from");
    return null;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  const factList = [
    `[Fact 1] ${chapterScript.keyFacts[0]}`,
    `[Fact 2] ${chapterScript.keyFacts[1] || chapterScript.keyFacts[0]}`,
    `[Fact 3] ${chapterScript.keyFacts[2] || chapterScript.keyFacts[chapterScript.keyFacts.length - 1]}`,
    `[Cause] ${chapterScript.cause}`,
    `[Effect] ${chapterScript.effect}`,
    `[Takeaway] ${chapterScript.takeaway}`
  ];

  if (!apiKey) {
    recordFallback(diagnostics, "documentaryWriter.card", "no API key configured");
    return getFallbackCard(resolved, chapterScript, cardIndex, factList);
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a Senior Editor at National Geographic and The New York Times.
Your job is ONLY to convert the approved factual bullets for "${chapterScript.chapterTitle}" into a premium perspective chapter narration.

Format the summary paragraph to follow the alternating documentary pattern:
Sentence 1: Fact 1 (supported by [Fact 1]). MUST start with a concrete date, person, place, or entity.
Sentence 2: Explanation/Cause (supported by [Cause])
Sentence 3: Fact 2 (supported by [Fact 2])
Sentence 4: Explanation/Effect (supported by [Effect])
Sentence 5: Fact 3 (supported by [Fact 3])
Sentence 6: Conclusion/Takeaway (supported by [Takeaway])

Strict Writing Rules:
1. Sentence average length MUST be 15-20 words. Avoid sentences longer than 25 words.
2. Mix sentence lengths for natural cadence.
3. Eliminate all corporate buzzwords, filler, and AI words.
4. Directly answer the question: "${chapterScript.questionAnswered}".
5. Every sentence must end with its exact fact tag, e.g. "Sentence text [Fact 1]." or "Explanation text [Cause]."

Approved facts and details:
${factList.join("\n")}

Return a JSON object:
{
  "title": "Specific documentary title (max 5 words)",
  "summary": "Narrative paragraph text with tags (exactly 6 sentences, 70-95 words)",
  "keyTakeaway": "Concise summary takeaway (max 10 words, no tags)"
}

Only return raw JSON. Start with { and end with }. Do not wrap in markdown.`;

  const start = Date.now();
  try {
    const { response, meta } = await callGeminiModel(ai, {
      contents: prompt,
      config: { temperature: 0.15, maxOutputTokens: 400 }
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { title: string; summary: string; keyTakeaway: string };
    const processedSummary = parseProvenanceAndClean(parsed.summary, factList);

    if (containsPlaceholder(processedSummary.summary) || containsPlaceholder(parsed.title)) {
      recordGeminiSuccess(diagnostics, "documentaryWriter.card", meta, Date.now() - start, true);
      return getFallbackCard(resolved, chapterScript, cardIndex, factList);
    }

    const card: PerspectiveCard = {
      title: parsed.title || chapterScript.chapterTitle,
      summary: sanitizeBannedWords(processedSummary.summary),
      referenceLabel: chapterScript.referenceLabel || "Overview",
      readerQuestion: chapterScript.questionAnswered,
      keyTakeaway: sanitizeBannedWords(parsed.keyTakeaway || chapterScript.takeaway),
      provenance: processedSummary.provenance.map(p => ({
        sentence: sanitizeBannedWords(p.sentence),
        fact: sanitizeBannedWords(p.fact)
      }))
    };

    recordGeminiSuccess(diagnostics, "documentaryWriter.card", meta, Date.now() - start);

    return card;
  } catch (error) {
    console.warn(`writeDocumentaryCard failed for chapter ${cardIndex}, using fallback`, error);
    recordGeminiFailure(diagnostics, "documentaryWriter.card", error, Date.now() - start);
  }

  return getFallbackCard(resolved, chapterScript, cardIndex, factList);
}

export function sanitizeBannedWords(text: string): string {
  let clean = text
    .replace(/\bInc\./g, "Inc")
    .replace(/\bCo\./g, "Co")
    .replace(/\bU\.S\./g, "US")
    .replace(/\bU\.K\./g, "UK")
    .replace(/\bvs\./g, "vs")
    .replace(/\bapprox\./g, "approx")
    .replace(/\bca\./g, "ca")
    .replace(/\be\.g\./g, "eg")
    .replace(/\bi\.e\./g, "ie")
    .replace(/\bSt\./g, "St")
    .replace(/\bDr\./g, "Dr")
    .replace(/\bMr\./g, "Mr")
    .replace(/\bMrs\./g, "Mrs")
    .replace(/\bMs\./g, "Ms")
    .replace(/\bGen\./g, "Gen")
    .replace(/\bCol\./g, "Col")
    .replace(/\bLt\./g, "Lt")
    .replace(/\bCapt\./g, "Capt");
  const replacements: Array<[RegExp, string]> = [
    [/\bframeworks?\b/gi, "basis"],
    [/\becosystems?\b/gi, "environment"],
    [/\bprotocols?\b/gi, "system"],
    [/\bstakeholders?\b/gi, "participants"],
    [/\bleveraged\b/gi, "used"],
    [/\bmethodologies?\b/gi, "approaches"],
    [/\bmethodology\b/gi, "approach"],
    [/\boptimizations?\b/gi, "improvements"],
    [/\boptimization\b/gi, "improvement"],
    [/\bselected markers\b/gi, "markers"],
    [/\bour team\b/gi, "researchers"],
    [/\bcompiled data\b/gi, "data"],
    [/\bindustry practitioners\b/gi, "experts"],
    [/\bvalidations?\b/gi, "verifications"],
    [/\bvalidation\b/gi, "verification"],
    [/\bimplementations?\b/gi, "versions"],
    [/\bimplementation\b/gi, "version"],
    [/\bdeployments?\b/gi, "installations"],
    [/\bdeployment\b/gi, "installation"],
    [/\bcore parameters\b/gi, "main details"],
    [/\butilize\b/gi, "use"],
    [/\butilizing\b/gi, "using"],
    [/\baccelerating adoption\b/gi, "growing use"],
    [/\bsecondary adaptations\b/gi, "adaptations"],
    [/\bsystematic approach\b/gi, "method"],
    [/\bcomprehensive analysis\b/gi, "study"],
    [/\bcritical infrastructure\b/gi, "core system"],
    [/\bdynamic environment\b/gi, "setting"],
    [/\bbest practices\b/gi, "standards"],
    [/\bplayed an important role\b/gi, "contributed"],
    [/\bserves? as a foundation\b/gi, "led to"],
    [/\bserves? as the foundation\b/gi, "led to"],
    [/\bserved as a foundation\b/gi, "led to"],
    [/\bmarked a turning point\b/gi, "changed course"],
    [/\bhelped shape\b/gi, "guided"],
    [/\bwidely recognized\b/gi, "known"],
    [/\bcontinues to influence\b/gi, "still impacts"],
    [/\bsignificant milestone\b/gi, "major event"],
    [/\bover time\b/gi, "eventually"],
    [/\bthroughout history\b/gi, "historically"],
    [/\bacross industries\b/gi, "widely"],
    [/\bcentering upon\b/gi, "focusing on"],
    [/\bthese observations\b/gi, "these details"],
    [/\bcompiled data reveals\b/gi, "records show"],
    [/\bthis establishes\b/gi, "this shows"],
    [/\bmechanisms?\b/gi, "systems"],
    [/\btherefore\b/gi, "thus"],
    [/\bcollectively\b/gi, "together"]
  ];

  for (const [pattern, repl] of replacements) {
    clean = clean.replace(pattern, repl);
  }
  return clean;
}

function parseProvenanceAndClean(
  taggedText: string,
  sourceFacts: string[]
): { summary: string; provenance: Array<{ sentence: string; fact: string }> } {
  const sentences = taggedText.split(/(?<=[.!?])\s+/).filter(Boolean);
  const cleanSentences: string[] = [];
  const provenance: Array<{ sentence: string; fact: string }> = [];

  sentences.forEach((s) => {
    const tagMatch = s.match(/\[(Fact \d+|Cause|Effect|Takeaway)\]/i);
    let matchedFact = "Factual documentation details.";
    
    if (tagMatch) {
      const tagStr = tagMatch[1].toLowerCase();
      const found = sourceFacts.find(f => f.toLowerCase().includes(`[${tagStr}]`));
      if (found) {
        matchedFact = found.replace(/\[Fact \d+\]|\[Cause\]|\[Effect\]|\[Takeaway\]/gi, "").trim();
      }
    } else {
      matchedFact = sourceFacts[0].replace(/\[Fact \d+\]/gi, "").trim();
    }

    const cleanSentence = s.replace(/\[(Fact \d+|Cause|Effect|Takeaway)\]/gi, "").replace(/\s+/g, " ").trim();
    if (cleanSentence) {
      const sanitizedS = sanitizeBannedWords(cleanSentence);
      const sanitizedF = sanitizeBannedWords(matchedFact);
      cleanSentences.push(sanitizedS);
      provenance.push({
        sentence: sanitizedS,
        fact: sanitizedF
      });
    }
  });

  return {
    summary: cleanSentences.join(" "),
    provenance
  };
}

// Deterministic recovery path. Previously used a local cleanFact() that
// blindly sliced to 11 words and substituted the invented phrase
// "Foundational historical occurrences" when a chapter had no real facts
// (V17_FORENSIC_AUDIT.md, Bug #5 — the Japan kanji example came from this
// exact truncation). Both are gone: chapters with no real facts are
// skipped entirely rather than backfilled, and real facts are compressed
// with sentenceCleaner's clause-aware logic, never cut mid-thought.
function getFallbackSummary(
  resolved: ResolvedEntity,
  script: FactScript
): { summary: string; provenance: Array<{ sentence: string; fact: string }> } {
  const sentences: string[] = [];
  const provenance: Array<{ sentence: string; fact: string }> = [];

  const usableChapters = script.chapters.filter((ch) => !ch.insufficientData && ch.keyFacts.length > 0);

  usableChapters.slice(0, 3).forEach((ch) => {
    const factText = cleanFragment(ch.keyFacts[0], 20);
    if (!factText) return;
    const sentence = `${resolved.canonicalTitle} records confirm that ${factText}.`;
    sentences.push(sentence);
    provenance.push({ sentence, fact: factText });
  });

  const lastWithTakeaway = [...script.chapters].reverse().find((ch) => !ch.insufficientData && ch.takeaway);
  if (lastWithTakeaway) {
    const finalFact = cleanFragment(lastWithTakeaway.takeaway, 16);
    if (finalFact) {
      const finalSentence = `${resolved.canonicalTitle} remains a study topic showing that ${finalFact}.`;
      sentences.push(finalSentence);
      provenance.push({ sentence: finalSentence, fact: finalFact });
    }
  }

  return {
    summary: sentences.join(" "),
    provenance
  };
}

// Deterministic recovery path, reached only for a chapter whose
// cause/effect/takeaway/keyFacts are already verified non-empty by the
// caller (writeDocumentaryCard's guard above). Uses sentenceCleaner's
// clause-aware compression instead of the old 11-word blind slice.
function getFallbackCard(
  resolved: ResolvedEntity,
  chapterScript: FactScriptChapter,
  cardIndex: number,
  factList: string[]
): PerspectiveCard {
  const extract = (tagged: string) => tagged.replace(/\[(Fact \d+|Cause|Effect|Takeaway)\]/gi, "").trim();

  const f1 = cleanFragment(extract(factList[0]), 16);
  const f2 = cleanFragment(extract(factList[1]), 16);
  const f3 = cleanFragment(extract(factList[2]), 16);
  const cause = cleanFragment(extract(factList[3]), 14);
  const effect = cleanFragment(extract(factList[4]), 14);
  const takeaway = cleanFragment(extract(factList[5]), 12);

  // V17: Concrete paragraph starts and strict word-count limits (exactly 6 sentences, average 15-20 words, mix lengths)
  // Vary connecting phrases based on cardIndex to ensure 4-word identical phrases do not repeat across cards
  let sentences: string[] = [];
  if (cardIndex === 0) {
    sentences = [
      `${resolved.canonicalTitle} records verify that ${f1}.`,
      `Early motivation drove research explaining why ${cause}.`,
      `Subsequent investigations established that ${f2}.`,
      `Because of these dynamics, details show ${effect}.`,
      `${resolved.canonicalTitle} data confirms that ${f3}.`,
      `These changes established the basis for ${takeaway}.`
    ];
  } else if (cardIndex === 1) {
    sentences = [
      `Historical records confirm that ${f1}.`,
      `These revelations inspired further exploration showing why ${cause}.`,
      `Later studies verified that ${f2}.`,
      `Following these events, analysts observed that ${effect}.`,
      `Scientific tracking confirms that ${f3}.`,
      `This transition created the groundwork for ${takeaway}.`
    ];
  } else if (cardIndex === 2) {
    sentences = [
      `Primary documentation reveals that ${f1}.`,
      `Such outcomes led observers to trace why ${cause}.`,
      `Archival reviews showed that ${f2}.`,
      `With these developments, researchers saw that ${effect}.`,
      `Detailed observations show that ${f3}.`,
      `This structure formed the design for ${takeaway}.`
    ];
  } else if (cardIndex === 3) {
    sentences = [
      `Factual chronicles state that ${f1}.`,
      `Ongoing difficulties drove thorough inquiries explaining why ${cause}.`,
      `Recent compilations proved that ${f2}.`,
      `Under these conditions, experts noted that ${effect}.`,
      `Ontology patterns map that ${f3}.`,
      `This transition shaped the modern standard for ${takeaway}.`
    ];
  } else {
    sentences = [
      `Verified sources show that ${f1}.`,
      `The legacy prompted key factions to identify why ${cause}.`,
      `Independent reviews confirmed that ${f2}.`,
      `Through these achievements, leaders realized that ${effect}.`,
      `Statistical records track that ${f3}.`,
      `This layout outlines the final outcome of ${takeaway}.`
    ];
  }

  const provenance = sentences.map((s, idx) => {
    let sourceFact = f1;
    if (idx === 1) sourceFact = cause;
    if (idx === 2) sourceFact = f2;
    if (idx === 3) sourceFact = effect;
    if (idx === 4) sourceFact = f3;
    if (idx === 5) sourceFact = takeaway;
    return {
      sentence: s,
      fact: sourceFact
    };
  });

  return {
    title: chapterScript.chapterTitle,
    summary: sentences.join(" "),
    referenceLabel: chapterScript.referenceLabel || "Overview",
    readerQuestion: chapterScript.questionAnswered,
    keyTakeaway: takeaway,
    provenance
  };
}
