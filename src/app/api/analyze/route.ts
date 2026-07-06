import { NextResponse } from "next/server";
import { getArticleIntelligence, getRelatedArticles, searchWikipedia } from "@/lib/wikipedia";
import {
  createCacheKey,
  getCachedAnalysis,
  setCachedAnalysis,
  getCachedStage,
  setCachedStage
} from "@/lib/cache";

const MAX_INPUT_CHARS = 120000;

interface ArticleSource {
  title: string;
  description?: string;
  extract: string;
  thumbnail?: { source: string } | null;
  content_urls?: { desktop?: { page?: string } } | null;
}

interface Intelligence {
  categories?: string[];
  sectionHeadings?: string[];
}

interface Classification {
  category: string;
  subcategory: string;
  confidence: number;
  readerIntent: string;
  editorialStyle: string;
}

interface CardPlan {
  readerQuestion: string;
  perspectiveTitle: string;
  referenceLabel: string;
  factsToUse: string;
  factsToAvoid: string;
}

interface PerspectiveCard {
  title: string;
  summary: string;
  referenceLabel: string;
  readerQuestion: string;
  keyTakeaway?: string | null;
}

interface StructuredFacts {
  title: string;
  subtitle: string;
  leadParagraph: string;
  categories: string[];
  majorSections: string[];
  relatedArticles: string[];
  importantDates: string[];
  extractSummary: string;
}

interface RelatedArticleInput {
  title: string;
  description?: string;
}

interface RelatedTopic {
  title: string;
  description: string;
}

function truncateForGemini(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.slice(0, MAX_INPUT_CHARS);
}

/**
 * Stage 1: Build a clean, structured facts package from raw Wikipedia contents.
 */
function buildStructuredFacts(articleSource: ArticleSource, intelligence: Intelligence | null, related: RelatedArticleInput[]): StructuredFacts {
  const paragraphs = articleSource.extract.split(/\n+/).map((p: string) => p.trim()).filter(Boolean);
  const leadParagraph = paragraphs[0] || "";

  // Extract dates (e.g. years like 1945, 2026, 476 AD)
  const extractText = articleSource.extract;
  const yearMatches = Array.from(extractText.matchAll(/\b(1\d{3}|2\d{3}|[1-9]\d{1,2})\s*(ad|bc)?\b/gi)).map((m) => m[0]);
  const uniqueDates = Array.from(new Set(yearMatches)).slice(0, 10);

  return {
    title: articleSource.title,
    subtitle: articleSource.description || "",
    leadParagraph,
    categories: intelligence?.categories || [],
    majorSections: intelligence?.sectionHeadings || [],
    relatedArticles: related.map((r) => String(r.title || "")),
    importantDates: uniqueDates,
    extractSummary: paragraphs.slice(0, 5).join("\n"),
  };
}

/**
 * Stage 2: Category Classification (Lightweight Gemini call)
 */
async function runStage2Classification(topicKey: string, structuredFacts: StructuredFacts): Promise<Classification> {
  const cached = await getCachedStage(topicKey, "stage2-classification");
  if (cached) return cached as Classification;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      category: "General",
      subcategory: "General",
      confidence: 1.0,
      readerIntent: "General knowledge",
      editorialStyle: "Narrative explainer"
    };
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert taxonomist. Classify the following topic into a single primary type.
Topic Title: ${structuredFacts.title}
Subtitle: ${structuredFacts.subtitle}
Lead Paragraph: ${structuredFacts.leadParagraph}
Categories: ${structuredFacts.categories.join(", ")}

Return valid JSON with this exact schema:
{
  "category": "e.g. Historical Empire, Movie, Book, Scientist, Technology, Landmark, City, Historical Event, Company, Fictional Character, Music Artist, etc.",
  "subcategory": "e.g. Ancient Civilization, Science Fiction Film, etc.",
  "confidence": 0.95,
  "readerIntent": "Short description of what a curious reader wants to understand in 5 minutes.",
  "editorialStyle": "Recommended narrative style."
}

Do not return any markdown wrappers. Start with { and end with }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.1, maxOutputTokens: 150 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as Classification;
    await setCachedStage(topicKey, "stage2-classification", parsed);
    return parsed;
  } catch (error) {
    console.warn("Stage 2 Category Classification failed", error);
    return {
      category: "General",
      subcategory: "General",
      confidence: 0.5,
      readerIntent: "General knowledge",
      editorialStyle: "Narrative explainer"
    };
  }
}

/**
 * Stage 3: Editorial Planner (Lightweight Gemini call)
 */
async function runStage3Planning(topicKey: string, structuredFacts: StructuredFacts, classification: Classification): Promise<{ cards: CardPlan[] }> {
  const cached = await getCachedStage(topicKey, "stage3-plan");
  if (cached) return cached as { cards: CardPlan[] };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { cards: [] };

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a Senior Editorial Director. Design the editorial outline of 5 analysis perspectives for this topic.
Topic: ${structuredFacts.title}
Category: ${classification.category} (${classification.subcategory})
Reader Intent: ${classification.readerIntent}

Select 5 completely unique reader questions and card titles (headlines, 2-6 words) that best explore this topic. Refer to these guidelines:
- For Empires: Rise, Government, Daily Life, Collapse, Legacy
- For Movies: Plot, Characters, Themes, Reception, Awards
- For Scientists: Discovery, Method, Challenges, Impact, Legacy
- For Cities: History, Culture, Neighbourhoods, Landmarks, Visitor Tips
- For Technology: Problem, How it Works, Evolution, Applications, Future
- For Companies: Origins, Products, Business Model, Growth, Future
- For Historical Events: Trigger, Major Players, Turning Points, Consequences, Legacy
Adapt naturally to other categories. Ensure zero factual overlap between perspectives.

Return valid JSON matching this schema:
{
  "cards": [
    {
      "readerQuestion": "Distinct reader question (e.g. 'How did Rome govern?')",
      "perspectiveTitle": "Headline, 2-6 words (e.g. 'Engineering an Empire'). Do not use generic headings like 'Overview', 'History', 'Legacy', 'Importance', 'Summary'.",
      "referenceLabel": "Label, 1-3 words (e.g. 'Governance')",
      "factsToUse": "Comma-separated list of facts unique to this perspective",
      "factsToAvoid": "Comma-separated list of facts to avoid to prevent duplicate overlap with other perspectives"
    }
  ]
}

Return exactly 5 cards. Do not return any markdown wrappers. Start with { and end with }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.2, maxOutputTokens: 600 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { cards: CardPlan[] };
    await setCachedStage(topicKey, "stage3-plan", parsed);
    return parsed;
  } catch (error) {
    console.warn("Stage 3 Editorial Planning failed", error);
    return { cards: [] };
  }
}

/**
 * Stage 5: Editorial Summary (With QA retry loop)
 */
async function runStage5EditorialBrief(topicKey: string, structuredFacts: StructuredFacts, classification: Classification): Promise<string> {
  const cached = await getCachedStage(topicKey, "stage5-brief");
  if (cached) return (cached as { shortSummary: string }).shortSummary;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  let prompt = `You are a Senior Editor. Write a polished, premium editorial brief explaining why the topic matters and why the reader should care.
Topic: ${structuredFacts.title}
Subtitle: ${structuredFacts.subtitle}
Lead paragraph: ${structuredFacts.leadParagraph}
Category: ${classification.category}

Requirements:
1. Maximum 150 words.
2. The first sentence MUST explain immediately why this topic matters.
3. Never begin with '{topic} is', '{topic} was', 'The {topic} is', or equivalent robotic definition. Start with immediate insight.
4. Avoid citations, bracket dates, pronunciations.

Return valid JSON matching this schema:
{
  "shortSummary": "Editorial brief text"
}

Do not return any markdown wrappers. Start with { and end with }.`;

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.3, maxOutputTokens: 300 },
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      const parsed = JSON.parse(text) as { shortSummary: string };
      const summary = parsed.shortSummary || "";
      const words = summary.split(/\s+/).filter(Boolean).length;

      let hasForbiddenPrefix = false;
      const firstSentence = summary.split(/[.!?]/)[0] || "";
      const lowerFirst = firstSentence.toLowerCase().trim();
      const forbiddenPrefixes = [
        `${structuredFacts.title.toLowerCase()} is`,
        `${structuredFacts.title.toLowerCase()} was`,
        `${structuredFacts.title.toLowerCase()} has been`,
        `the ${structuredFacts.title.toLowerCase()} is`,
        `the ${structuredFacts.title.toLowerCase()} was`
      ];
      for (const prefix of forbiddenPrefixes) {
        if (lowerFirst.startsWith(prefix)) {
          hasForbiddenPrefix = true;
        }
      }

      if (words <= 150 && !hasForbiddenPrefix && words > 10) {
        await setCachedStage(topicKey, "stage5-brief", parsed);
        return summary;
      }

      prompt = `${prompt}

RETRY FEEDBACK: The previous summary failed validation.
${words > 150 ? `- It has ${words} words, which exceeds the 150-word maximum.` : ""}
${hasForbiddenPrefix ? `- First sentence started with a robotic definition like "${firstSentence.trim()}". Please rewrite to start immediately with insight.` : ""}
Please rewrite the summary correcting these issues.`;
    } catch (e) {
      console.warn("Failed to parse brief on attempt", attempts, e);
    }
  }

  return `${structuredFacts.leadParagraph || structuredFacts.subtitle}. This crucial topic has shaped historical, cultural, and scientific contexts.`;
}

/**
 * Stage 4: Independent Card Generation (With QA retry loop & factual overlap prevention)
 */
async function runStage4CardGeneration(
  topicKey: string,
  cardIndex: number,
  cardPlan: CardPlan,
  structuredFacts: StructuredFacts,
  factsAlreadyUsed: string
): Promise<PerspectiveCard> {
  const cached = await getCachedStage(topicKey, `stage4-card-${cardIndex}`);
  if (cached) return cached as PerspectiveCard;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      title: cardPlan.perspectiveTitle,
      referenceLabel: cardPlan.referenceLabel,
      readerQuestion: cardPlan.readerQuestion,
      summary: `Exploring key dynamics regarding ${cardPlan.perspectiveTitle.toLowerCase()} and its legacy.`,
      keyTakeaway: `Core lesson of ${cardPlan.referenceLabel.toLowerCase()}.`
    };
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  let prompt = `You are a Magazine Staff Writer. Write a single analysis perspective card matching these exact directions.
Topic: ${structuredFacts.title}
Perspective Title: ${cardPlan.perspectiveTitle}
Perspective Label: ${cardPlan.referenceLabel}
Reader Question: ${cardPlan.readerQuestion}
Facts to include: ${cardPlan.factsToUse}
Facts to avoid: ${cardPlan.factsToAvoid}

Context Facts:
${truncateForGemini(structuredFacts.extractSummary)}

Factual Overlap Prevention (Do not repeat these details from previous perspectives):
${factsAlreadyUsed || "No previous perspectives written yet."}

Requirements:
1. Summary must be 70-120 words (strict maximum 120 words).
2. Write like an article, not encyclopedic lists.
3. Card headline/title must be 2-6 words.
4. Card summary must not start with the topic name or robotic definitions (e.g. no "The [Topic] was...").
5. The card summary must directly answer the assigned reader question.
6. The keyTakeaway must be under 18 words.

Return valid JSON matching this schema:
{
  "title": "Editorial headline, 2-6 words",
  "referenceLabel": "Label, 1-3 words",
  "readerQuestion": "Reader question answered",
  "summary": "Editorial card content text (70-120 words)",
  "keyTakeaway": "Takeaway summary sentence (max 18 words)"
}

Do not return any markdown wrappers. Start with { and end with }.`;

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.3, maxOutputTokens: 400 },
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      const parsed = JSON.parse(text) as PerspectiveCard;
      const summary = parsed.summary || "";
      const summaryWords = summary.split(/\s+/).filter(Boolean).length;
      const titleWords = (parsed.title || "").split(/\s+/).filter(Boolean).length;
      const takeawayWords = (parsed.keyTakeaway || "").split(/\s+/).filter(Boolean).length;
      const lowerSummary = summary.toLowerCase().trim();
      const lowerTopic = structuredFacts.title.toLowerCase();

      const genericTitles = ["overview", "history", "legacy", "importance", "summary"];
      const isGenericTitle = genericTitles.includes((parsed.title || "").toLowerCase().trim());

      let validationFailed = false;
      const errors: string[] = [];

      if (summaryWords > 120) {
        errors.push(`Summary has ${summaryWords} words, exceeding the 120-word maximum limit.`);
        validationFailed = true;
      }
      if (titleWords > 6 || titleWords < 2) {
        errors.push(`Title has ${titleWords} words, which violates the 2-6 word count guideline.`);
        validationFailed = true;
      }
      if (takeawayWords > 18) {
        errors.push(`Key takeaway has ${takeawayWords} words, exceeding the 18-word maximum.`);
        validationFailed = true;
      }
      if (lowerSummary.startsWith(lowerTopic)) {
        errors.push(`Summary starts directly with the topic title: "${summary.slice(0, 30)}...". Avoid robotic definition starts.`);
        validationFailed = true;
      }
      if (isGenericTitle) {
        errors.push(`Title ("${parsed.title}") is generic. Headlines must be creative and editorial.`);
        validationFailed = true;
      }

      if (!validationFailed) {
        await setCachedStage(topicKey, `stage4-card-${cardIndex}`, parsed);
        return parsed;
      }

      prompt = `${prompt}

RETRY FEEDBACK: The previous card generation failed validations:
${errors.map((e) => `- ${e}`).join("\n")}
Please rewrite the card conforming to the guidelines.`;
    } catch (e) {
      console.warn(`Failed to parse card ${cardIndex} on attempt ${attempts}`, e);
    }
  }

  return {
    title: cardPlan.perspectiveTitle,
    referenceLabel: cardPlan.referenceLabel,
    readerQuestion: cardPlan.readerQuestion,
    summary: `This key perspective focuses on ${cardPlan.perspectiveTitle.toLowerCase()}. It outlines how these dynamics evolved, why they are significant, and how they influenced the broader structural legacy.`,
    keyTakeaway: `Key lesson regarding ${cardPlan.referenceLabel.toLowerCase()}.`
  };
}

/**
 * Stage 6: Surprising Did You Know facts curation (With QA retry loop)
 */
async function runStage6DidYouKnow(topicKey: string, structuredFacts: StructuredFacts): Promise<string[]> {
  const cached = await getCachedStage(topicKey, "stage6-didyouknow");
  if (cached) return (cached as { didYouKnow: string[] }).didYouKnow;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return [
      `${structuredFacts.title} remains of global significance.`,
      `History of ${structuredFacts.title} spans key developments.`,
      `Aspects of ${structuredFacts.title} continue to impact modern society.`
    ];
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  let prompt = `You are a Fact Curator. Generate exactly three surprising, memorable, and independently verifiable facts about the topic.
Topic: ${structuredFacts.title}
Context:
${truncateForGemini(structuredFacts.extractSummary)}

Requirements:
1. Return exactly three facts.
2. Each fact must be under 20 words.
3. Facts must be sourced from the provided information.

Return valid JSON matching this schema:
{
  "didYouKnow": [
    "Fact 1 under 20 words",
    "Fact 2 under 20 words",
    "Fact 3 under 20 words"
  ]
}

Do not return any markdown wrappers. Start with { and end with }.`;

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.4, maxOutputTokens: 250 },
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      const parsed = JSON.parse(text) as { didYouKnow: string[] };
      const facts = parsed.didYouKnow || [];

      let failed = false;
      const errors: string[] = [];

      if (facts.length !== 3) {
        errors.push(`Generated ${facts.length} facts instead of exactly 3.`);
        failed = true;
      }

      facts.forEach((fact: string, i: number) => {
        const words = String(fact || "").split(/\s+/).filter(Boolean).length;
        if (words > 20) {
          errors.push(`Fact ${i + 1} exceeds 20 words (${words} words).`);
          failed = true;
        }
      });

      if (!failed) {
        await setCachedStage(topicKey, "stage6-didyouknow", parsed);
        return facts;
      }

      prompt = `${prompt}

RETRY FEEDBACK: The facts failed validation:
${errors.map((e) => `- ${e}`).join("\n")}
Please rewrite them keeping each under 20 words.`;
    } catch (e) {
      console.warn("Failed to parse didYouKnow on attempt", attempts, e);
    }
  }

  return [
    `${structuredFacts.title} represents a key development in its respective field.`,
    `Aspects of ${structuredFacts.title} continue to influence modern discussion.`,
    `Studies of ${structuredFacts.title} reveal deep historical or technical relevance.`
  ];
}

/**
 * Stage 7: Related Topics Ranking
 */
async function runStage7RelatedTopics(
  topicKey: string,
  relatedArticles: string[],
  classification: Classification
): Promise<RelatedTopic[]> {
  const cached = await getCachedStage(topicKey, "stage7-related");
  if (cached) return (cached as { relatedTopics: RelatedTopic[] }).relatedTopics;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return relatedArticles.slice(0, 8).map((title) => ({ title, description: "Related topic" }));
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an Information Architect. Rank and filter these related Wikipedia article links for a reader exploring the main topic.
Main Topic Category: ${classification.category}
Related article options: ${relatedArticles.slice(0, 15).join(", ")}

Rank them by:
1. Likelihood of being the next search
2. Reader curiosity
3. Conceptual relevance

Return a maximum of 8 topics. For each, write a concise explanation of its connection to the topic.
Return valid JSON matching this schema:
{
  "relatedTopics": [
    {
      "title": "Wikipedia Article Title",
      "description": "Short connection summary"
    }
  ]
}

Do not return any markdown wrappers. Start with { and end with }.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.2, maxOutputTokens: 600 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as { relatedTopics: RelatedTopic[] };
    const result = Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics.slice(0, 8) : [];
    await setCachedStage(topicKey, "stage7-related", { relatedTopics: result });
    return result;
  } catch (e) {
    console.warn("Failed to generate related topics, returning fallbacks", e);
    return relatedArticles.slice(0, 8).map((title) => ({ title, description: "Explore this connected concept." }));
  }
}

function getFallbackCards(category: string, title: string, extract: string): PerspectiveCard[] {
  const defaultPerspectives = [
    { label: "Origins", q: `How did ${title} start?` },
    { label: "Key Dynamics", q: `What drives ${title}?` },
    { label: "Developments", q: `How did ${title} evolve?` },
    { label: "Significance", q: `Why does ${title} matter?` },
    { label: "Legacy", q: `What is ${title}'s impact?` }
  ];
  const paragraphs = extract.split(/\n+/).map((p: string) => p.trim()).filter(Boolean);

  return defaultPerspectives.map((theme, i) => {
    let summaryText = paragraphs[i] || paragraphs[0] || `Exploring the ${theme.label.toLowerCase()} of ${title}.`;
    const words = summaryText.split(/\s+/).filter(Boolean);
    if (words.length < 80) {
      summaryText += ` This crucial thematic perspective illustrates the broad historic and conceptual legacy of ${title}, showing how it influenced developments and persists in the modern scholarly discourse.`;
    }

    return {
      title: `${theme.label}`,
      summary: summaryText.slice(0, 800),
      referenceLabel: theme.label,
      readerQuestion: theme.q,
      keyTakeaway: `Key milestone concerning ${title}'s ${theme.label.toLowerCase()} trajectory.`,
    };
  });
}

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

/**
 * Cleanup helper for duplicates
 */
function cleanupDuplicates(shortSummary: string, resultCards: PerspectiveCard[]): PerspectiveCard[] {
  const summaryTokens = cleanAndTokenize(shortSummary);
  const seenPrefixes = new Set<string>();

  return resultCards.map((card, index) => {
    const cardSummary = card.summary || "";
    const cardTokens = cleanAndTokenize(cardSummary);

    const prefix8 = cardTokens.slice(0, 8).join(" ");
    let isDuplicate = false;

    if (prefix8.length > 0) {
      if (seenPrefixes.has(prefix8)) {
        isDuplicate = true;
      }
      seenPrefixes.add(prefix8);
    }

    const overlapWithSummary = getOverlapRatio(cardTokens, summaryTokens);
    if (overlapWithSummary > 0.6) {
      isDuplicate = true;
    }

    for (let j = 0; j < index; j++) {
      const prevTokens = cleanAndTokenize(resultCards[j].summary || "");
      if (getOverlapRatio(cardTokens, prevTokens) > 0.6) {
        isDuplicate = true;
        break;
      }
    }

    if (isDuplicate) {
      const title = card.title || "Perspective";
      const takeaway = card.keyTakeaway || "An essential perspective.";
      const label = card.referenceLabel || "Analysis";
      const fallbackSummary = `This key theme, centered on ${title.toLowerCase()}, represents a pivotal aspect of ${label.toLowerCase()}. ${takeaway} It provides crucial insights into how this dimension shaped the broader historical and conceptual landscape.`;
      return {
        ...card,
        summary: fallbackSummary,
      };
    }

    return card;
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { topic?: string };
    const topic = body.topic?.trim();

    if (!topic) {
      return NextResponse.json({ error: "A topic is required." }, { status: 400 });
    }

    const topicKey = createCacheKey(topic);
    const cachedData = await getCachedAnalysis(topicKey);
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cacheStatus: "hit",
      });
    }

    // Retrieve from Wikipedia
    const article = await searchWikipedia(topic);
    if (!article) {
      return NextResponse.json({ error: "No article was found for that topic." }, { status: 404 });
    }

    const intelligence = await getArticleIntelligence(topic);
    const articleSource = intelligence || article;
    const related = await getRelatedArticles(topic);

    // Stage 1: structured facts extraction
    const structuredFacts = buildStructuredFacts(articleSource, intelligence, related);

    // Stage 2: Category Classification
    const classification = await runStage2Classification(topicKey, structuredFacts);

    // Stage 3: Editorial Planning
    const plan = await runStage3Planning(topicKey, structuredFacts, classification);
    const plannedCards = Array.isArray(plan?.cards) && plan.cards.length === 5 ? plan.cards : null;

    // Stage 5: Editorial Summary
    const shortSummary = await runStage5EditorialBrief(topicKey, structuredFacts, classification);

    // Stage 4: Independent Card Generation
    const resultCards: PerspectiveCard[] = [];
    if (plannedCards) {
      for (let i = 0; i < 5; i++) {
        const factsAlreadyUsed = resultCards.map((c) => c.summary).join("\n");
        const card = await runStage4CardGeneration(
          topicKey,
          i,
          plannedCards[i],
          structuredFacts,
          factsAlreadyUsed
        );
        resultCards.push(card);
      }
    } else {
      // Fallback grid cards if planner fails
      const fallbacks = getFallbackCards(classification.category, structuredFacts.title, structuredFacts.extractSummary);
      for (let i = 0; i < 5; i++) {
        resultCards.push(fallbacks[i]);
      }
    }

    // Stage 6: Surprising Facts Curation
    const didYouKnow = await runStage6DidYouKnow(topicKey, structuredFacts);

    // Stage 7: Related Topics Ranking
    const relatedTopics = await runStage7RelatedTopics(topicKey, structuredFacts.relatedArticles, classification);

    // Post-process duplicate filtering to guarantee clean cards
    const dedupedCards = cleanupDuplicates(shortSummary, resultCards);

    const processedCards = dedupedCards.map((card: PerspectiveCard) => ({
      title: String(card.title || "").slice(0, 100),
      summary: String(card.summary || ""),
      referenceLabel: String(card.referenceLabel || "Perspective"),
      readerQuestion: String(card.readerQuestion || `Perspective insight`),
      keyTakeaway: card.keyTakeaway ? String(card.keyTakeaway).slice(0, 150) : null,
    }));

    const responseData = {
      article: {
        title: articleSource.title,
        description: articleSource.description || "",
        extract: articleSource.extract,
        thumbnail: articleSource.thumbnail?.source ?? null,
        url: articleSource.content_urls?.desktop?.page ?? null,
      },
      topicCategory: classification.category,
      shortSummary,
      resultCards: processedCards,
      didYouKnow: didYouKnow.map((fact) => String(fact).slice(0, 150)),
      relatedTopics: relatedTopics.map((rt) => ({
        title: String(rt.title || ""),
        description: String(rt.description || ""),
      })),
      generatedAt: new Date().toISOString(),
      cacheVersion: "results-v8-editorial-engine",
    };

    await setCachedAnalysis(topicKey, responseData);

    return NextResponse.json({
      ...responseData,
      cacheStatus: "miss",
    });
  } catch (error) {
    console.error("Analyze route error", error);
    return NextResponse.json({ error: "The analysis request failed." }, { status: 500 });
  }
}
