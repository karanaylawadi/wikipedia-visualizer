import { NextResponse } from "next/server";
import { getArticleIntelligence, getRelatedArticles, searchWikipedia } from "@/lib/wikipedia";
import { createCacheKey, getCachedAnalysis, setCachedAnalysis } from "@/lib/cache";

const MAX_INPUT_CHARS = 120000;

const geminiPrompt = `You are the Chief Editor of Visualizer.wiki. Your mission is to transform factual Wikipedia articles into a premium visual knowledge experience for an intelligent reader with 5-10 minutes.
Your writing style must combine:
- National Geographic (immersive, narrative)
- The New York Times (intellectual, crisp)
- Encyclopaedia Britannica (scholarly, authoritative)
- Apple Human Interface (concise, clear, elegant)
- Bloomberg explainers (structured, analytical)

Never copy Wikipedia wording. Rewrite everything naturally. Never sound robotic.

Return valid JSON matching this schema:
{
  "topicCategory": "One of the 30 allowed categories listed below.",
  "shortSummary": "Premium editorial introduction. Explain what it is, why it matters, and why it is remembered today in 120-150 words (maximum 180 words). Do not copy raw Wikipedia text. Avoid pronunciations, citations, dates, or lists.",
  "resultCards": [
    {
      "title": "Editorial title, 2-6 words. Magazine headline style (e.g. 'The Cold War Moves to Space', 'Inside the Roman Empire', 'The Moon Race Begins'). Never start with 'It' or end mid-sentence.",
      "summary": "Cohesive summary of this perspective, 80-120 words (maximum 150 words). Focus on ONE idea. Do not copy raw Wikipedia sentences. Do not repeat the card title in the summary body.",
      "referenceLabel": "A descriptive section or source label (e.g. 'Sputnik Crisis', 'Lunar Architecture').",
      "imageHint": "A specific Wikipedia page title or search query for a landscape or square image related to this perspective.",
      "metadata": {
        // Structured metadata based on topic Category. Read instructions below.
      }
    }
  ],
  "didYouKnow": [
    "Fact 1 (maximum 25 words. Surprising, fascinating fact)",
    "Fact 2 (maximum 25 words)",
    "Fact 3 (maximum 25 words)"
  ],
  "relatedTopics": [
    {
      "title": "Wikipedia article title (e.g., 'Apollo 11')",
      "description": "Short explanation of the relationship."
    }
  ]
}

Instructions for card level "metadata":
Provide an object with string keys and values representing the structured metadata for the topic.
- historical_event, war_conflict, sports_event: year, location, keyPeople, duration
- landmark, building_architecture, artwork, historical_place, tourist_place: built, architect, location, unesco, annualVisitors (or artist, year, medium, museum for artwork)
- city: country, population, founded, language
- country: capital, population, currency, officialLanguage
- movie, tv_show, video_game: director, releaseYear, runtime, genre, boxOffice, awards (use developer, publisher for video_game; creator, seasons, episodes for tv_show)
- book: author, published, genre, pages
- person, politician, artist_actor, author, music_artist, inventor: born, died, nationality, occupation, knownFor
- scientist: field, majorDiscovery, awards
- company, brand: founded, headquarters, industry, founder, ceo, employees
- technology, science_concept: inventor, introduced, industry, currentStatus (or field, keyApplications)
- sports_team: league, founded, stadium, championships
- religion, mythology: origin, followers, holyText
- generic: No metadata required (return empty object {}).

30 Allowed Categories:
historical_event, war_conflict, historical_place, tourist_place, landmark, building_architecture, city, country, person, politician, scientist, inventor, artist_actor, author, movie, tv_show, book, music_artist, album_song, company, brand, technology, science_concept, sports_team, sports_event, religion, mythology, artwork, video_game, generic

Classification Examples:
- Space Race -> historical_event
- Roman Empire -> historical_event
- Titanic (film) -> movie
- Titanic (ship) -> historical_event
- Steve Jobs -> person
- Apple Inc -> company
- Quantum Computing -> science_concept
- ChatGPT -> technology
- Taj Mahal -> landmark
- Dubai -> city
- India -> country

Perspective Planning (resultCards MUST contain exactly 5 elements):
For the topic, ask yourself: 'If someone searched this topic, what are the five most useful perspectives they would want to explore?' Select the five strongest perspectives. Each topic should feel unique.
Do not use rigid layout templates. For Space Race, write on Origins, Sputnik, Moon Landing, Cold War Politics, Scientific Legacy. For Taj Mahal, write on History, Architecture, Mumtaz Mahal, Visiting Today, UNESCO Legacy.

Editorial Review Step:
Before producing final JSON, perform a review:
1. Ensure perfect grammar and natural English.
2. Ensure card summaries are under 150 words and shortSummary is under 180 words.
3. Card titles must be engaging, 2-6 words, and contain no awkward 'of Space Race' style suffix.
4. Facts must be accurate, surprising, and under 25 words.
5. Generate 6-10 related topics. Avoid raw years, generic dates, or maintenance pages.
6. The JSON output must be completely valid and contain NO markdown block wrappers (like \`\`\`json). Start with { and end with }.`;

// Fallback logic in case Gemini fails
function getFallbackCategory(categories: string[], title: string, extract: string): string {
  const text = `${title} ${extract} ${categories.map((c) => c.replace(/^Category:/i, "")).join(" ")}`.toLowerCase();

  if (title.toLowerCase().includes("space race")) return "historical_event";
  if (title.toLowerCase().includes("taj mahal")) return "landmark";
  if (title.toLowerCase().includes("roman empire")) return "historical_event";
  if (title.toLowerCase().includes("titanic") && text.includes("film")) return "movie";
  if (title.toLowerCase().includes("titanic") && (text.includes("ship") || text.includes("sinking"))) return "historical_event";
  if (title.toLowerCase().includes("steve jobs")) return "person";
  if (title.toLowerCase().includes("apple inc.")) return "company";
  if (title.toLowerCase().includes("quantum computing")) return "science_concept";
  if (title.toLowerCase().includes("eiffel tower")) return "landmark";
  if (title.toLowerCase().includes("world war")) return "war_conflict";

  if (text.includes("film") || text.includes("cinema") || text.includes("movie") || text.includes("directed by")) return "movie";
  if (text.includes("television series") || text.includes("tv show") || text.includes("sitcom")) return "tv_show";
  if (text.includes("novel") || text.includes("book") || text.includes("literature") || text.includes("written by")) return "book";
  if (text.includes("singer") || text.includes("musician") || text.includes("band") || text.includes("orchestra")) return "music_artist";
  if (text.includes("song") || text.includes("single") || text.includes("album") || text.includes("track")) return "album_song";

  if (text.includes("politician") || text.includes("president") || text.includes("prime minister") || text.includes("senator")) return "politician";
  if (text.includes("actor") || text.includes("actress") || text.includes("director") || text.includes("artist") || text.includes("painter") || text.includes("sculptor")) return "artist_actor";
  if (text.includes("writer") || text.includes("poet") || text.includes("novelist") || text.includes("author")) return "author";
  if (text.includes("scientist") || text.includes("physicist") || text.includes("chemist") || text.includes("mathematician")) return "scientist";
  if (text.includes("inventor") || text.includes("engineer")) return "inventor";
  if (text.includes("biography") || text.includes("born") || text.includes("died") || text.includes("person")) return "person";

  if (text.includes("war ") || text.includes("battle ") || text.includes("campaign ") || text.includes("military conflict")) return "war_conflict";
  if (text.includes("treaty ") || text.includes("revolution ") || text.includes("historical event") || text.includes("space race")) return "historical_event";

  if (text.includes("city") || text.includes("capital")) return "city";
  if (text.includes("country") || text.includes("nation") || text.includes("republic") || text.includes("state")) return "country";
  if (text.includes("landmark") || text.includes("monument")) return "landmark";
  if (text.includes("archaeological site") || text.includes("ruins")) return "historical_place";
  if (text.includes("attraction") || text.includes("park") || text.includes("resort") || text.includes("tourism")) return "tourist_place";

  if (text.includes("architecture") || text.includes("building") || text.includes("palace") || text.includes("castle") || text.includes("temple") || text.includes("cathedral")) return "building_architecture";
  if (text.includes("painting") || text.includes("sculpture") || text.includes("artwork") || text.includes("museum piece")) return "artwork";
  if (text.includes("company") || text.includes("brand") || text.includes("corporation") || text.includes("founded in")) return "company";
  if (text.includes("technology") || text.includes("software") || text.includes("hardware") || text.includes("engine") || text.includes("computing")) return "technology";
  if (text.includes("quantum") || text.includes("physics") || text.includes("theory") || text.includes("concept") || text.includes("science")) return "science_concept";

  if (text.includes("sports team") || text.includes("club") || text.includes("fc") || text.includes("franchise")) return "sports_team";
  if (text.includes("olympic") || text.includes("tournament") || text.includes("sports event") || text.includes("championship")) return "sports_event";
  if (text.includes("mythology") || text.includes("religion") || text.includes("god") || text.includes("deity")) return "religion";

  return "generic";
}

function getFallbackCards(category: string, title: string, extract: string, sectionHeadings: string[]) {
  const defaultPerspectives = ["Overview", "Historical Context", "Key Development", "Importance", "Legacy"];
  const paragraphs = extract.split(/\n+/).map((p) => p.trim()).filter(Boolean);

  return defaultPerspectives.map((theme, i) => {
    const hint = sectionHeadings[i] || title;
    let summaryText = paragraphs[i] || paragraphs[0] || `Exploring the ${theme.toLowerCase()} of ${title}.`;

    const words = summaryText.split(/\s+/).filter(Boolean);
    if (words.length < 85) {
      summaryText += ` This crucial thematic perspective illustrates the broad historic and conceptual legacy of ${title}, showing how it influenced developments and persists in the modern scholarly discourse.`;
    }

    return {
      title: `${theme}`,
      summary: summaryText.slice(0, 800),
      referenceLabel: theme,
      imageHint: hint,
      metadata: {},
    };
  });
}

function truncateForGemini(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.slice(0, MAX_INPUT_CHARS);
}

async function getWikipediaThumbnail(title: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        title
      )}&prop=pageimages&piprop=thumbnail&pithumbsize=600&format=json&origin=*`
    );
    if (!response.ok) return null;
    const data = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = Object.values(data.query?.pages || {})[0] as any;
    if (page?.thumbnail) {
      const { source, width, height } = page.thumbnail;
      if (width && height && width >= height) {
        return source;
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching card thumbnail:", error);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getGeminiInsights(articleTitle: string, articleExtract: string, sectionHeadings: string[]): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const contents = `${geminiPrompt}\n\nArticle title: ${articleTitle}\n\nArticle text:\n${truncateForGemini(articleExtract)}\n\nSection Headings available:\n${sectionHeadings.slice(0, 15).join(", ")}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: { temperature: 0.2, maxOutputTokens: 4000 },
    });

    const text = typeof response.text === "string" ? response.text : "";
    if (!text) return null;

    const cleanText = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanText);
    return parsed;
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

    const cacheKey = createCacheKey(topic);
    const cachedData = await getCachedAnalysis(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cacheStatus: "hit",
      });
    }

    const article = await searchWikipedia(topic);
    if (!article) {
      return NextResponse.json({ error: "No article was found for that topic." }, { status: 404 });
    }

    const intelligence = await getArticleIntelligence(topic);
    const articleSource = intelligence || article;
    const related = await getRelatedArticles(topic);

    const sectionHeadings = intelligence?.sectionHeadings || [];

    const gemini = await getGeminiInsights(articleSource.title, articleSource.extract, sectionHeadings);

    let topicCategory = gemini?.topicCategory;
    let shortSummary = gemini?.shortSummary;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resultCards: any[] = gemini?.resultCards;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let relatedTopics: any[] = gemini?.relatedTopics;
    let didYouKnow: string[] = gemini?.didYouKnow;

    if (!topicCategory) {
      topicCategory = getFallbackCategory(intelligence?.categories || [], articleSource.title, articleSource.extract);
    }

    if (!shortSummary || shortSummary.split(/\s+/).length < 80) {
      const paragraphs = articleSource.extract.split(/\n+/).map((p) => p.trim()).filter(Boolean);
      shortSummary = paragraphs.slice(0, 2).join(" ");
      const words = shortSummary.split(/\s+/).filter(Boolean);
      if (words.length < 80) {
        shortSummary += ` This article provides a comprehensive overview of ${articleSource.title}, detailing its background, applications, key milestones, and broader significance.`;
      }
    }

    if (!Array.isArray(resultCards) || resultCards.length !== 5) {
      resultCards = getFallbackCards(topicCategory, articleSource.title, articleSource.extract, sectionHeadings);
    }

    if (!Array.isArray(relatedTopics) || relatedTopics.length === 0) {
      relatedTopics = (Array.isArray(related) ? related.slice(0, 8) : []).map((item) => ({
        title: item.title,
        description: item.description || "Related concept explored in Wikipedia",
      }));
    }

    if (!Array.isArray(didYouKnow) || didYouKnow.length !== 3) {
      didYouKnow = [
        `${articleSource.title} remains a subject of enduring global significance and discussion.`,
        `The documented history of ${articleSource.title} spans key cultural, social, or scientific developments.`,
        `Major aspects of ${articleSource.title} continue to influence modern society and historical analysis.`
      ];
    }

    const resultCardsWithImages = await Promise.all(
      resultCards.map(async (card) => {
        let imageUrl = null;
        const searchHint = card.imageHint || card.imageSearchHint;
        if (searchHint) {
          imageUrl = await getWikipediaThumbnail(searchHint);
        }
        if (!imageUrl && articleSource.thumbnail?.source) {
          const thumb = articleSource.thumbnail as { source: string; width?: number; height?: number };
          const width = thumb.width ?? 600;
          const height = thumb.height ?? 400;
          if (width >= height) {
            imageUrl = thumb.source;
          }
        }
        return {
          title: String(card.title || "").slice(0, 100),
          summary: String(card.summary || ""),
          referenceLabel: String(card.referenceLabel || card.sourceSection || "Detail"),
          imageHint: String(searchHint || ""),
          imageUrl,
          metadata: card.metadata && typeof card.metadata === "object" ? card.metadata : {},
        };
      })
    );

    const responseData = {
      article: {
        title: articleSource.title,
        description: articleSource.description || "",
        extract: articleSource.extract,
        thumbnail: articleSource.thumbnail?.source ?? null,
        url: articleSource.content_urls?.desktop?.page ?? null,
      },
      topicCategory,
      shortSummary,
      resultCards: resultCardsWithImages,
      didYouKnow: didYouKnow.map((fact) => String(fact).slice(0, 150)),
      relatedTopics: relatedTopics.map((rt) => ({
        title: String(rt.title || ""),
        description: String(rt.description || ""),
      })),
      generatedAt: new Date().toISOString(),
      cacheVersion: "results-v4-premium-editorial",
    };

    await setCachedAnalysis(cacheKey, responseData);

    return NextResponse.json({
      ...responseData,
      cacheStatus: "miss",
    });
  } catch (error) {
    console.error("Analyze route error", error);
    return NextResponse.json({ error: "The analysis request failed." }, { status: 500 });
  }
}
