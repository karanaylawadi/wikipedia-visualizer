import { getCachedStage, setCachedStage } from "./cache";
import type { TopicKnowledge } from "@/types/wiki";

export async function extractTopicKnowledge(
  topicKey: string,
  article: {
    title: string;
    description?: string;
    extract: string;
    categories?: string[];
    sectionHeadings?: string[];
  },
  relatedList: Array<{ title: string; description?: string }>
): Promise<TopicKnowledge> {
  const cached = await getCachedStage(topicKey, "knowledge");
  if (cached) {
    return cached as TopicKnowledge;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback = getFallbackTopicKnowledge(article, relatedList);
    await setCachedStage(topicKey, "knowledge", fallback);
    return fallback;
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a Senior Editor and Knowledge Graph Engineer. Build a structured knowledge layer (TopicKnowledge object) for the topic "${article.title}".
Analyze the Wikipedia article below and extract precise structured facts and metadata.

Topic: ${article.title}
Description: ${article.description || ""}
Categories: ${(article.categories || []).join(", ")}
Section Headings: ${(article.sectionHeadings || []).join(", ")}

Extract text:
${article.extract}

Extract the following fields and return a single valid JSON object matching the TopicKnowledge schema:
1. "title": The title of the topic.
2. "description": A concise, engaging 1-2 sentence description of what the topic is.
3. "category": Classify the topic into the single most appropriate primary type from:
Historical Empire, Historical Event, Country, City, Region, Landmark, Architecture, Painting, Artwork, Artist, Scientist, Inventor, Technology, Scientific Concept, Movie, TV Series, Book, Video Game, Company, Brand, Sports Team, Person, Political Figure, Animal, Plant, Food, Music Album, Song, Religion, Mythology, Space Mission, Space Object, Programming Language, Operating System, Disease, Medicine, Chemical Element.
4. "summaryFacts": Exactly 7-10 highly specific, standalone facts that define the topic. No generalizations.
5. "timeline": Exactly 5-8 chronological milestones. Each milestone must be a JSON object with:
   - "year": The year or date string (e.g., "1957", "753 BC").
   - "event": A short description of the milestone (max 8 words).
   Order them chronologically.
6. "people": List of up to 10 key people associated with this topic.
7. "places": List of up to 10 key locations, regions, or geographical markers.
8. "organizations": List of up to 8 key companies, institutions, groups, or factions.
9. "events": List of up to 8 key events, wars, battles, or milestones.
10. "dates": List of up to 8 important years, eras, or periods.
11. "numbers": List of up to 8 specific statistics, quantities, metrics, or currencies.
12. "works": List of up to 6 books, paintings, films, publications, or compositions.
13. "inventions": List of up to 6 technologies, methods, concepts, or scientific breakthroughs created/used.
14. "themes": List of 3-5 core themes, philosophies, or motifs.
15. "relationships": List of 3-5 key relationships or interactions between entities (e.g. "X designed Y", "A defeated B").
16. "surprisingFacts": Exactly 5 surprising, highly memorable, shareable trivia facts about the topic.
17. "relatedTopics": List of up to 10 related topic names (suitable for Wikipedia search).
18. "sourceSections": List of sections in the article. For each section, include:
    - "title": Section heading.
    - "content": A highly concise summary or bullet list of 2-4 key facts from that section. DO NOT write long paragraphs of prose.

Schema format:
{
  "title": "",
  "description": "",
  "category": "",
  "summaryFacts": [],
  "timeline": [{ "year": "", "event": "" }],
  "people": [],
  "places": [],
  "organizations": [],
  "events": [],
  "dates": [],
  "numbers": [],
  "works": [],
  "inventions": [],
  "themes": [],
  "relationships": [],
  "surprisingFacts": [],
  "relatedTopics": [],
  "sourceSections": [{ "title": "", "content": "" }]
}

Do not return markdown formatting blocks. Just return raw JSON starting with { and ending with }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.15, maxOutputTokens: 2500 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as TopicKnowledge;

    // Set defaults for missing fields
    parsed.title = parsed.title || article.title;
    parsed.description = parsed.description || article.description || "";
    parsed.category = parsed.category || "General";
    parsed.summaryFacts = parsed.summaryFacts || [];
    parsed.timeline = parsed.timeline || [];
    parsed.people = parsed.people || [];
    parsed.places = parsed.places || [];
    parsed.organizations = parsed.organizations || [];
    parsed.events = parsed.events || [];
    parsed.dates = parsed.dates || [];
    parsed.numbers = parsed.numbers || [];
    parsed.works = parsed.works || [];
    parsed.inventions = parsed.inventions || [];
    parsed.themes = parsed.themes || [];
    parsed.relationships = parsed.relationships || [];
    parsed.surprisingFacts = parsed.surprisingFacts || [];
    parsed.relatedTopics = parsed.relatedTopics || relatedList.map(r => r.title);
    parsed.sourceSections = parsed.sourceSections || [];

    await setCachedStage(topicKey, "knowledge", parsed);
    return parsed;
  } catch (error) {
    console.warn("TopicKnowledge extraction failed, using fallback", error);
    const fallback = getFallbackTopicKnowledge(article, relatedList);
    await setCachedStage(topicKey, "knowledge", fallback);
    return fallback;
  }
}

function getFallbackTopicKnowledge(
  article: { title: string; description?: string; extract: string; categories?: string[] },
  relatedList: Array<{ title: string; description?: string }>
): TopicKnowledge {
  const paragraphs = article.extract.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const title = article.title;
  const description = article.description || paragraphs[0] || "Encyclopedia Profile";
  const category = "General";
  const summaryFacts = paragraphs.slice(0, 5);

  const extractText = article.extract;
  const yearMatches = Array.from(extractText.matchAll(/\b(1\d{3}|2\d{3}|[1-9]\d{1,2})\s*(ad|bc|ce|bce)?\b/gi)).map((m) => m[0]);
  const dates = Array.from(new Set(yearMatches)).slice(0, 10);

  const statMatches = Array.from(extractText.matchAll(/\b(\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?\s*(?:billion|million|trillion)?|\b\d{1,3}(?:,\d{3})+\b)\b/gi)).map((m) => m[0]);
  const numbers = Array.from(new Set(statMatches)).slice(0, 8);

  const capitalizationMatches = Array.from(extractText.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g)).map((m) => m[0]);
  const uniqueEntities = Array.from(new Set(capitalizationMatches)).filter(
    (name) => name !== article.title && !name.startsWith("The ")
  );

  const places: string[] = [];
  const people: string[] = [];
  const organizations: string[] = [];

  const locationKeywords = ["City", "State", "River", "Mountain", "Sea", "Ocean", "Union", "Empire", "Carthage", "Rome", "America", "Europe", "Asia", "London", "Paris", "Washington"];
  const orgKeywords = ["Company", "Inc", "Co", "University", "Association", "Organization", "NASA", "Soviet", "Committee", "Party", "Senate", "Council"];

  for (const entity of uniqueEntities) {
    if (locationKeywords.some(kw => entity.includes(kw))) {
      if (places.length < 8) places.push(entity);
    } else if (orgKeywords.some(kw => entity.includes(kw))) {
      if (organizations.length < 8) organizations.push(entity);
    } else {
      if (people.length < 8) people.push(entity);
    }
  }

  const timeline = dates.slice(0, 5).map((d, index) => ({
    year: d,
    event: `Significant milestone ${index + 1} for ${title}`
  }));

  const surprisingFacts = [
    `${title} has a rich and complex history.`,
    `Scholars and researchers continue to study ${title}.`,
    `Key aspects of ${title} have global influence.`,
    `Documents detail the origins and spread of ${title}.`,
    `Numerous artifacts and documents record the legacy of ${title}.`
  ];

  const sourceSections = paragraphs.slice(0, 4).map((p, idx) => ({
    title: `Section ${idx + 1}`,
    content: p.slice(0, 100) + "..."
  }));

  return {
    title,
    description,
    category,
    summaryFacts,
    timeline,
    people,
    places,
    organizations,
    events: [],
    dates,
    numbers,
    works: [],
    inventions: [],
    themes: ["Legacy", "Development"],
    relationships: [],
    surprisingFacts,
    relatedTopics: relatedList.map(r => r.title),
    sourceSections
  };
}
