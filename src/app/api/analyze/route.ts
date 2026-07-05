import { NextResponse } from "next/server";
import { getArticleIntelligence, getRelatedArticles, searchWikipedia } from "@/lib/wikipedia";

const MAX_INPUT_CHARS = 120000;
const geminiPrompt = `Return valid JSON only. Use the following schema:
{
  "editorialBrief": "Encyclopedia-style summary briefing of the topic.",
  "timeline": [
    {
      "year": "Event year (e.g. '1804' or 'Context')",
      "title": "Concise title, maximum 10-12 words",
      "summary": "Cohesive summary of the event.",
      "significance": "Historical or conceptual significance at the time.",
      "longTermImpact": "The long-term legacy or consequences.",
      "relatedPeople": ["Key figures involved"],
      "relatedPlaces": ["Key locations involved"]
    }
  ],
  "relatedArticles": [
    {
      "title": "Wikipedia article title (e.g. 'French Revolution')",
      "description": "Short explanation of its relation to the topic.",
      "relevanceScore": 0.95, // Float between 0.0 and 1.0 representing importance
      "category": "One of: 'person', 'place', 'event', 'organization', 'concept', 'period'",
      "connections": ["Titles of other articles in this relatedArticles list that this node connects to"]
    }
  ]
}
Do not include any JSON wrappers or markdown code blocks (like \`\`\`json). Start with { and end with }. Do not add outside facts. Ensure all text is grammatically correct and reads naturally like a professionally edited encyclopedia.`;

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").replace(/\[\d+\]/g, "").trim();
}

function createEditorialBriefFallback(extract: string, title: string) {
  const sentences = extract
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeText(sentence))
    .filter(Boolean);

  const meaningful = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    if (sentence.length < 40) return false;
    if (lower.includes("this article") || lower.includes("may refer to") || lower.includes("can refer to")) {
      return false;
    }
    return true;
  });

  const summarySentences = meaningful.slice(0, 4);
  let summary = summarySentences.join(" ");

  if (summary.length < 140) {
    summary = `${title} is a subject of enduring historical, cultural, and political significance. ${summary}`.trim();
  }

  const words = summary.split(/\s+/).filter(Boolean);
  if (words.length < 80) {
    summary = `${summary} Its legacy continues to shape public memory, institutions, and the broader historical narrative.`;
  }

  if (words.length > 130) {
    const clipped = words.slice(0, 125).join(" ");
    return `${clipped.replace(/[.,;:]+$/, "")} .`;
  }

  return summary;
}

function refineEditorialBrief(seed: string | null, extract: string, title: string) {
  const fallback = createEditorialBriefFallback(extract, title);
  const baseText = normalizeText(seed || fallback);
  const candidateSentences = baseText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeText(sentence))
    .filter(Boolean);

  if (candidateSentences.length === 0) {
    return fallback;
  }

  const compact = candidateSentences.slice(0, 3).join(" ");
  const words = compact.split(/\s+/).filter(Boolean);
  if (words.length >= 80 && words.length <= 120) {
    return compact;
  }

  return createEditorialBriefFallback(extract, title);
}

function createTimelineTitle(sentence: string, title: string) {
  let body = normalizeText(sentence);

  body = body.replace(/\b(?:1[0-9]{3}|20[0-9]{2}|[0-9]{1,3}\s?(?:BC|BCE|CE|AD|A\.D\.)|(?:early|mid|late|middle)\s+(?:[0-9]{1,2}(?:st|nd|rd|th)?\s+)?(?:century|centuries)|(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty-first|twenty-second|twenty-third|twenty-fourth)\s*(?:century|centuries))\b/gi, "");
  body = body.replace(/^(?:in|during|by|from|after|before|on|at|under|around|over)\s+/i, "");
  body = body.replace(/^(?:the|a|an)\s+/i, "");
  body = body.replace(/^(?:saw|was|were|is|are|became|began|led|marked|followed|resulted|included|formed|established|ended|collapsed|rose|fell)\b/i, "");
  body = body.replace(/^[,;:\-–—\s]+/, "");
  body = body.replace(/\.$/, "");

  const cleaned = body
    .replace(/\s+/g, " ")
    .replace(/\b(?:was|were|is|are|became|became|began|led|marked|followed|resulted|included|formed|established|ended|collapsed|rose|fell)\b/gi, "")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (!words.length) return title;

  const trimmed = words.slice(0, 8).join(" ");
  if (!trimmed) return title;

  return trimmed.replace(/^[,;:\-–—\s]+/, "").replace(/[.,;:]+$/, "");
}

function extractYear(value: string) {
  const match = value.match(/\b(?:1[0-9]{3}|20[0-9]{2}|[0-9]{1,3}\s?(?:BC|BCE|CE|AD|A\.D\.))\b/i);
  return match?.[0].trim() || "Context";
}

function inferMilestoneTitle(sentence: string, title: string) {
  const body = normalizeText(sentence).replace(/\.$/, "");
  const lower = body.toLowerCase();

  const explicitEventPatterns = [
    /\b(Battle|Siege|Treaty|Conquest|Coronation|Election|Revolution|Crisis|Fall|Capture|Founding|Formation|Unification|Independence|Succession)\b/i,
    /\b(?:Battle|Siege|Treaty|Conquest|Coronation|Election|Revolution|Crisis|Fall|Capture|Founding|Formation|Unification|Independence|Succession)\s+of\s+([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+)*)/i,
    /\b([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+)*)\s+(?:Battle|Siege|Treaty|Conquest|Coronation|Election|Revolution|Crisis|Fall|Capture|Founding|Formation|Unification|Independence|Succession)\b/i,
  ];

  for (const pattern of explicitEventPatterns) {
    const match = body.match(pattern);
    if (match?.[1]) {
      return `${match[0].replace(/\s+/g, " ").trim()}`;
    }
  }

  if (/\b(found(?:ed|ing)?|establish(?:ed|ment)?|founded)\b/i.test(lower)) {
    return `Founding of ${title}`;
  }
  if (/\b(coronat(?:ion|ed))\b/i.test(lower)) {
    return `Coronation of ${title}`;
  }
  if (/\b(war|battle|campaign|invasion|siege)\b/i.test(lower)) {
    return `Battle of ${title}`;
  }
  if (/\b(discover(?:y|ed)|invent(?:ed|ion)|identified)\b/i.test(lower)) {
    return `Discovery of ${title}`;
  }
  if (/\b(treaty|accord|pact|convention)\b/i.test(lower)) {
    return `Treaty of ${title}`;
  }
  if (/\b(revolut(?:ion|ionary)|independ(?:ence|ent)|election|referendum|coup|overthrow)\b/i.test(lower)) {
    return `Political change in ${title}`;
  }
  if (/\b(death|died|assassinat(?:ed|ion)|killed|murdered)\b/i.test(lower)) {
    return `Death of ${title}`;
  }
  if (/\b(collaps(?:e|ed)|declin(?:e|ed)|fall of|fell)\b/i.test(lower)) {
    return `Fall of ${title}`;
  }

  const candidate = createTimelineTitle(sentence, title);
  return candidate.length > 80 ? candidate.slice(0, 80) : candidate;
}

function extractEntityPhrases(text: string, title: string, kind: "person" | "place") {
  const seen = new Set<string>();
  const fragments: string[] = [];
  const candidateText = normalizeText(text);
  const normalizedTitle = title.replace(/\s+/g, " ").trim();

  const personPatterns = [
    /\b(?:King|Queen|Emperor|President|Prime Minister|Pope|Prince|Duke|Lord|Lady|Saint|General|Marshal)\s+[A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+)*/g,
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
  ];
  const placePatterns = [
    /\b(?:city|capital|province|region|state|country|island|river|mountain|desert|ocean|sea|empire|kingdom|republic|nation|valley|forest)\s+(?:of|in|on|near|across)\s+([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+)*)/g,
    /\b([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+)*)\s+(?:River|Mount|Mountain|Sea|Ocean|City|Province|State|Region|Capital|Empire|Kingdom|Republic|Country|Island|Desert)\b/g,
  ];

  const patterns = kind === "person" ? personPatterns : placePatterns;
  for (const pattern of patterns) {
    for (const match of candidateText.matchAll(pattern)) {
      const value = (match[1] || match[0] || "").replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "").trim();
      if (!value || value.length < 2 || value.toLowerCase() === normalizedTitle.toLowerCase()) continue;
      if (seen.has(value.toLowerCase())) continue;
      seen.add(value.toLowerCase());
      fragments.push(value);
      if (fragments.length === 3) break;
    }
    if (fragments.length === 3) break;
  }

  return fragments;
}

function buildFocusCardDetails(summary: string, extract: string, title: string) {
  const sentences = extract
    .split(/(?<=[.!?])\s+/)
    .map((entry) => normalizeText(entry))
    .filter(Boolean);

  const normalizedSummary = normalizeText(summary || "");
  const targetIndex = sentences.findIndex((sentence) => {
    const normalizedSentence = normalizeText(sentence);
    return normalizedSentence.includes(normalizedSummary.slice(0, 40)) || normalizedSummary.includes(normalizedSentence.slice(0, 40));
  });

  const whatHappened = normalizedSummary || sentences[targetIndex] || `This milestone shaped the historical arc of ${title}.`;
  const whyItMattered = sentences[targetIndex + 1]
    ? normalizeText(sentences[targetIndex + 1])
    : sentences[1]
      ? normalizeText(sentences[1])
      : `It marked an important turning point in the story of ${title}.`;
  const longTermImpact = sentences[targetIndex + 2]
    ? normalizeText(sentences[targetIndex + 2])
    : sentences[2]
      ? normalizeText(sentences[2])
      : `Its consequences continued to influence the broader historical context surrounding ${title}.`;

  return {
    whatHappened,
    whyItMattered,
    longTermImpact,
    relatedPeople: extractEntityPhrases(extract, title, "person"),
    relatedPlaces: extractEntityPhrases(extract, title, "place"),
  };
}

function createTimeline(extract: string, title: string, sectionHeadings: string[] = [], wikitext = "") {
  const sentences = extract
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const chronologyPattern = /\b(?:1[0-9]{3}|20[0-9]{2}|[0-9]{1,3}\s?(?:BC|BCE|CE)|(?:early|mid|late)?\s*(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty-first|twenty-second|twenty-third|twenty-fourth)\s*(?:century|centuries)|(?:[0-9]{1,2})(?:st|nd|rd|th)?\s*(?:century|centuries))\b/gi;

  const timeline: Array<{ year: string; title: string; summary: string; significance: string }> = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    const match = sentence.match(chronologyPattern);
    if (!match) continue;

    const year = match[0].trim();
    if (seen.has(year)) continue;

    const eventTitle = inferMilestoneTitle(sentence, title);

    timeline.push({
      year,
      title: eventTitle.charAt(0).toUpperCase() + eventTitle.slice(1),
      summary: sentence.replace(/\s+/g, " ").trim(),
      significance: `This milestone is part of the article's documented chronology and is grounded in the source text.`,
    });

    seen.add(year);

    if (timeline.length === 5) break;
  }

  if (timeline.length < 5) {
    const headingCandidates = sectionHeadings.filter((heading) =>
      /\b(?:history|early|late|foundation|war|revolution|treaty|death|election|collapse|conquest|independence|coronation|discovery|succession|birth|rise|fall|founding)\b/i.test(heading)
    );

    for (const candidate of headingCandidates) {
      const lineTitle = inferMilestoneTitle(candidate, title);
      if (timeline.some((item) => item.title === lineTitle)) continue;
      timeline.push({
        year: "Context",
        title: lineTitle,
        summary: candidate.replace(/\s+/g, " ").trim(),
        significance: `This milestone is derived from the article's section headings and historical context.`,
      });
      if (timeline.length === 5) break;
    }
  }

  if (timeline.length < 5) {
    const infoboxSignals = Array.from(wikitext.matchAll(/\|\s*(?:founded|founded_date|established|formed|birth_date|death_date|start_date|end_date|date|reign)\s*=\s*([^\n|]+)/gi));

    for (const match of infoboxSignals) {
      const value = (match[1] || "").trim();
      if (!value) continue;
      const year = extractYear(value);
      const lineTitle = inferMilestoneTitle(`${year} ${value}`, title);
      if (timeline.some((item) => item.title === lineTitle)) continue;
      timeline.push({
        year,
        title: lineTitle,
        summary: `${year}: ${value}`,
        significance: `This milestone is inferred from the article's infobox chronology.`,
      });
      if (timeline.length === 5) break;
    }
  }

  return timeline;
}

function truncateForGemini(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.slice(0, MAX_INPUT_CHARS);
}

async function getGeminiInsights(articleTitle: string, articleExtract: string, baseTimeline: Array<{ year: string; title: string; summary: string; significance: string }>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const contents = `${geminiPrompt}\n\nArticle title: ${articleTitle}\n\nArticle text:\n${truncateForGemini(articleExtract)}\n\nChronology candidates:\n${JSON.stringify(baseTimeline.slice(0, 3))}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: { temperature: 0.2, maxOutputTokens: 4000 },
    });

    const text = typeof (response as { text?: string }).text === "string" ? (response as { text?: string }).text : "";
    if (!text) return null;

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return {
      editorialBrief: typeof parsed.editorialBrief === "string" ? parsed.editorialBrief : null,
      timeline: Array.isArray(parsed.timeline)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? parsed.timeline.map((item: any) => ({
            year: String(item.year || "Context"),
            title: String(item.title || "").slice(0, 100),
            summary: String(item.summary || ""),
            significance: String(item.significance || ""),
            longTermImpact: String(item.longTermImpact || ""),
            relatedPeople: Array.isArray(item.relatedPeople) ? item.relatedPeople.map(String) : [],
            relatedPlaces: Array.isArray(item.relatedPlaces) ? item.relatedPlaces.map(String) : [],
          }))
        : [],
      relatedArticles: Array.isArray(parsed.relatedArticles)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? parsed.relatedArticles.map((item: any) => ({
            title: String(item.title || ""),
            description: String(item.description || ""),
            relevanceScore: typeof item.relevanceScore === "number" ? item.relevanceScore : 0.8,
            category: String(item.category || "concept"),
            connections: Array.isArray(item.connections) ? item.connections.map(String) : [],
          }))
        : [],
    };
  } catch (error) {
    console.warn("Gemini request failed; falling back to Wikipedia-only data", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { topic?: string };
    const topic = body.topic?.trim();

    if (!topic) {
      return NextResponse.json({ error: "A topic is required." }, { status: 400 });
    }

    const article = await searchWikipedia(topic);

    if (!article) {
      return NextResponse.json({ error: "No article was found for that topic." }, { status: 404 });
    }

    const intelligence = await getArticleIntelligence(topic);
    const articleSource = intelligence || article;
    const related = await getRelatedArticles(topic);
    const description = articleSource.description || articleSource.extract;
    const baseTimeline = createTimeline(articleSource.extract, articleSource.title, intelligence?.sectionHeadings || [], intelligence?.wikitext || "");
    const gemini = await getGeminiInsights(articleSource.title, articleSource.extract, baseTimeline);

    const editorialBrief = refineEditorialBrief(gemini?.editorialBrief || null, articleSource.extract, articleSource.title);
    
    // Map chronological timeline elements
    let timeline;
    if (gemini?.timeline?.length) {
      timeline = gemini.timeline;
    } else {
      timeline = baseTimeline.map((item) => {
        const focusDetails = buildFocusCardDetails(item.summary, articleSource.extract, articleSource.title);
        return {
          year: item.year,
          title: item.title,
          summary: item.summary,
          significance: item.significance || "This milestone is part of the article's documented chronology.",
          longTermImpact: focusDetails.longTermImpact || "Its consequences continued to shape the subject's historical context over time.",
          relatedPeople: focusDetails.relatedPeople || [],
          relatedPlaces: focusDetails.relatedPlaces || [],
        };
      });
    }

    // Map related concept graph articles
    let relatedArticles;
    if (gemini?.relatedArticles?.length) {
      relatedArticles = gemini.relatedArticles;
    } else {
      relatedArticles = (Array.isArray(related) ? related.slice(0, 8) : []).map((item) => ({
        title: item.title,
        description: item.description || "Related concept explored in Wikipedia",
        relevanceScore: 0.75,
        category: "concept",
        connections: [],
      }));
    }

    return NextResponse.json({
      article: {
        title: articleSource.title,
        description: articleSource.description,
        extract: articleSource.extract,
        thumbnail: articleSource.thumbnail?.source ?? null,
        url: articleSource.content_urls?.desktop?.page ?? null,
      },
      analysis: {
        title: `${articleSource.title}`,
        description,
        editorialBrief,
        briefing: editorialBrief,
        timeline: Array.isArray(timeline) ? timeline : [],
        relatedArticles,
      },
    });
  } catch (error) {
    console.error("Analyze route error", error);
    return NextResponse.json(
      { error: "The analysis request failed." },
      { status: 500 }
    );
  }
}
