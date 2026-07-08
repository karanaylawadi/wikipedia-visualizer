import { getCachedStage, setCachedStage } from "./cache";
import type { TopicKnowledge } from "@/types/wiki";
import { classifyEntity } from "./entityClassifier";

export async function extractTopicKnowledge(
  topicKey: string,
  article: {
    title: string;
    description?: string;
    extract: string;
    categories?: string[];
    sectionHeadings?: string[];
    wikitext?: string;
  },
  relatedList: Array<{ title: string; description?: string }>
): Promise<TopicKnowledge> {
  const cached = await getCachedStage(topicKey, "knowledge");
  if (cached) {
    return cached as TopicKnowledge;
  }

  // 1. Run Entity Classification
  const classification = await classifyEntity(topicKey, article);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback = getFallbackTopicKnowledge(classification.entityType, classification.subCategory, classification.ontologyLabels, article, relatedList);
    await setCachedStage(topicKey, "knowledge", fallback);
    return fallback;
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const subtypePrompt = getSubtypePromptInstructions(classification.entityType);

    const prompt = `You are a Senior Editor and Knowledge Graph Engineer. Build a structured knowledge layer (TopicKnowledge object) for the topic "${article.title}".
First, analyze the Wikipedia article below. Your task is to extract precise structured facts and metadata.

Topic: ${article.title}
Description: ${article.description || ""}
Categories: ${(article.categories || []).join(", ")}
Section Headings: ${(article.sectionHeadings || []).join(", ")}

Extract text:
${article.extract}

Classified Entity Type: ${classification.entityType}
Subcategory: ${classification.subCategory}
Ontology Path: ${classification.ontologyLabels.join(" > ")}

${subtypePrompt}

Ensure you ALSO populate the "common" field with:
1. "title": The canonical title.
2. "description": A concise, engaging 1-2 sentence description of what the topic is.
3. "category": ${classification.entityType}.
4. "summaryFacts": Exactly 7-10 highly specific, standalone facts.
5. "timeline": Exactly 5-8 chronological milestones. Each milestone must have "year" and "event" (max 8 words).
6. "surprisingFacts": Exactly 5 surprising, memorable trivia facts.
7. "relatedTopics": List of up to 10 related Wikipedia page titles.
8. "sourceSections": List of sections in the article. For each section, include "title" (the heading) and "content" (bullet list or summary of 2-4 key facts).

Return a valid JSON object matching the TopicKnowledge schema. DO NOT return markdown formatting blocks. Just return raw JSON starting with { and ending with }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.15, maxOutputTokens: 2500 },
    });

    const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
    const parsed = JSON.parse(text) as TopicKnowledge;

    // Ensure core fields exist
    parsed.entityType = classification.entityType;
    parsed.ontologyLabels = parsed.ontologyLabels || classification.ontologyLabels;
    parsed.common = parsed.common || {
      title: article.title,
      description: article.description || "",
      category: classification.entityType,
      summaryFacts: [],
      timeline: [],
      surprisingFacts: [],
      relatedTopics: relatedList.map(r => r.title),
      sourceSections: []
    };

    await setCachedStage(topicKey, "knowledge", parsed);
    return parsed;
  } catch (error) {
    console.warn("TopicKnowledge extraction failed, using fallback", error);
    const fallback = getFallbackTopicKnowledge(classification.entityType, classification.subCategory, classification.ontologyLabels, article, relatedList);
    await setCachedStage(topicKey, "knowledge", fallback);
    return fallback;
  }
}

function getSubtypePromptInstructions(entityType: string): string {
  if (entityType === "Movie" || entityType === "TV Series") {
    return `Because the entity is a Movie or TV Series, you MUST populate the "movieData" field and leave all other domain blocks (historyData, personData, countryData, etc.) empty/undefined.
"movieData" fields to extract:
- director: string (Lead director)
- producer: string (Lead producer or studio)
- cast: string[] (Top 4-6 main actors)
- genre: string (e.g., "Science Fiction", "Drama")
- runtime: string (e.g., "148 minutes")
- releaseDate: string (e.g., "July 16, 2010")
- boxOffice: string (e.g., "$836.8 million")
- budget: string (e.g., "$160 million")
- awards: string (e.g., "Won 4 Academy Awards")
- themes: string[] (Top 3-4 key themes, e.g. "dreams", "subconscious")
- plot: string (Concise 2-sentence spoiler-free setup)
- music: string (Composer, e.g. "Hans Zimmer")
- cinematography: string (Cinematographer, e.g. "Wally Pfister")
- ratings: string (e.g., "8.8/10 on IMDb")`;
  }
  if (entityType === "Person" || entityType === "Musical Artist") {
    return `Because the entity is a Person or Musical Artist, you MUST populate the "personData" field and leave all other domain blocks empty/undefined.
"personData" fields to extract:
- birth: string (Birth date and place, e.g., "March 14, 1879, Ulm, Germany")
- death: string (Death date and place, e.g., "April 18, 1955, Princeton, New Jersey")
- occupation: string (Primary career role, e.g., "Theoretical Physicist")
- majorWorks: string[] (Top 3-5 books, theories, compositions, e.g. ["General Theory of Relativity", "Photoelectric Effect"])
- timeline: array of milestones with year/date and event description
- awards: string[] (Key medals, awards, e.g. ["Nobel Prize in Physics (1921)", "Max Planck Medal (1929)"])
- legacy: string[] (Key ways they changed their field or society)
- controversies: string[] (Rivalries, political issues, or public disputes)`;
  }
  if (entityType === "Company" || entityType === "Brand") {
    return `Because the entity is a Company or Brand, you MUST populate the "companyData" field and leave all other domain blocks empty/undefined.
"companyData" fields to extract:
- founder: string (Co-founders, e.g. "Steve Jobs, Steve Wozniak, Ronald Wayne")
- industry: string (e.g. "Consumer electronics, Software")
- headquarters: string (e.g. "Cupertino, California")
- products: string[] (Top 4-6 product lines, e.g. ["iPhone", "Mac", "iPad"])
- businessModel: string (How they make money, e.g. "Premium hardware sales and services ecosystem")
- revenue: string (Latest annual revenue or valuation, e.g. "$383.29 billion")
- history: string[] (3-5 key milestones in company growth)
- competitors: string[] (Key rivals, e.g. ["Samsung", "Google", "Microsoft"])
- leadership: string[] (CEO and key officers)`;
  }
  if (entityType === "Historical Event" || entityType === "War" || entityType === "Empire" || entityType === "Civilization" || entityType === "Space Mission") {
    return `Because the entity is a historical entity, you MUST populate the "historyData" field and leave all other domain blocks empty/undefined.
"historyData" fields to extract:
- timeline: milestone array of key battles/dates/launches
- causes: string[] (3-5 underlying reasons or triggers)
- majorEvents: string[] (Top 3-5 battles, treaties, or landmark moments)
- consequences: string[] (Immediate aftermath, fallouts, structural re-alignments, or peace treaties)
- importantPeople: string[] (Generals, kings, commanders, presidents, or astronauts)
- geography: string[] (Locations, theaters of operation, territories)
- legacy: string[] (Long-term global footprint and modern lessons)`;
  }
  if (entityType === "Country" || entityType === "City") {
    return `Because the entity is a country or city, you MUST populate the "countryData" field and leave all other domain blocks empty/undefined.
"countryData" fields to extract:
- capital: string (Capital city or administration)
- population: string (Latest population census or estimate)
- gdp: string (Nominal GDP or economic tier)
- language: string (Official languages spoken)
- government: string (Political system or local administration)
- economy: string (Major economic sectors, e.g. "Service sector, tourism, manufacturing")
- bordering: string[] (Bordering countries, regions, or rivers)
- mapLocation: string (Continental or regional location)`;
  }
  if (entityType === "Book" || entityType === "Video Game" || entityType === "Artwork" || entityType === "Album" || entityType === "Song") {
    return `Because the entity is a Book, Video Game, or Artwork, you MUST populate the "bookData" field and leave all other domain blocks empty/undefined.
"bookData" fields to extract:
- author: string (Author, developer, or artist, e.g. "George Orwell")
- genre: string (e.g. "Dystopian fiction, political satire")
- publisher: string (e.g. "Secker & Warburg")
- releaseDate: string (e.g. "8 June 1949")
- themes: string[] (Top themes, e.g. ["Totalitarianism", "Surveillance", "Doublethink"])
- plotSummary: string (Spoiler-free 2-sentence narrative setup)
- pages: string (Number of pages or runtime)`;
  }
  if (entityType === "Organization") {
    return `Because the entity is an Organization, you MUST populate the "organizationData" field and leave all other domain blocks empty/undefined.
"organizationData" fields to extract:
- founder: string (Founding figures or members)
- type: string (e.g. "Intergovernmental military alliance")
- headquarters: string (e.g. "Brussels, Belgium")
- members: string[] (Key member states or groups)
- purpose: string (Primary mission or defense pact)
- history: string[] (3-5 historical highlights)`;
  }
  if (entityType === "Technology" || entityType === "Programming Language") {
    return `Because the entity is a Technology or Programming Language, you MUST populate the "technologyData" field and leave all other domain blocks empty/undefined.
"technologyData" fields to extract:
- inventor: string (Lead creators or developers, e.g. "Guido van Rossum")
- launchYear: string (Launch year, e.g. "1991")
- industry: string (Computing domain, e.g. "Software engineering, web, AI")
- architecture: string[] (Key design principles, e.g. ["Object-oriented", "Interpreted", "Dynamically typed"])
- competitors: string[] (Alternative technologies, e.g. ["JavaScript", "Ruby", "Go"])
- evolution: string[] (Key version upgrades and changes)
- future: string[] (Future roadmap and major challenges)
- adoption: string[] (Major organizations or platforms using it)`;
  }
  return `Because the entity is a scientific or academic concept, you MUST populate the "scienceData" field and leave all other domain blocks empty/undefined.
"scienceData" fields to extract:
- formula: string (Main formula, chemical equation, definition, or equivalent if applicable)
- discovery: string (Date and context of discovery)
- discoverer: string (Lead researchers or discoverers)
- applications: string[] (Real-world uses, technology, or medicines)
- limitations: string[] (Boundary conditions, exceptions, or criticisms)
- currentResearch: string[] (Modern research directives, questions)
- visualDiagramDesc: string (Textual description of a suitable visual flowchart or diagram)`;
}

function getFallbackTopicKnowledge(
  entityType: string,
  subCategory: string,
  ontologyLabels: string[],
  article: { title: string; description?: string; extract: string; categories?: string[] },
  relatedList: Array<{ title: string; description?: string }>
): TopicKnowledge {
  const paragraphs = article.extract.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const title = article.title;
  const description = article.description || paragraphs[0] || "Encyclopedia Profile";
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

  const base: TopicKnowledge = {
    entityType,
    ontologyLabels,
    common: {
      title,
      description,
      category: entityType,
      summaryFacts,
      timeline,
      surprisingFacts,
      relatedTopics: relatedList.map(r => r.title),
      sourceSections
    }
  };

  // Populate basic fallback structures
  if (entityType === "Movie" || entityType === "TV Series") {
    base.movieData = {
      director: people[0] || "Unknown Director",
      producer: organizations[0] || "Production Studio",
      cast: people.slice(1, 5),
      genre: subCategory,
      runtime: "120 minutes",
      releaseDate: dates[0] || "N/A",
      boxOffice: numbers[0] || "N/A",
      budget: numbers[1] || "N/A",
      awards: "Nominated for Oscars",
      themes: ["Storytelling", "Creation"],
      plot: description,
      music: people[5] || "Unknown",
      cinematography: people[6] || "Unknown",
      ratings: "8.0/10"
    };
  } else if (entityType === "Person" || entityType === "Musical Artist") {
    base.personData = {
      birth: dates[0] || "Unknown",
      death: dates[1] || "Unknown",
      occupation: "Notable Individual",
      majorWorks: ["First key contribution"],
      timeline,
      awards: ["Medal of Honor"],
      legacy: ["Pioneered major changes"],
      controversies: ["Public debates"]
    };
  } else if (entityType === "Company" || entityType === "Brand") {
    base.companyData = {
      founder: people[0] || "Unknown Founder",
      industry: subCategory,
      headquarters: places[0] || "Global",
      products: ["Key Products"],
      businessModel: "Enterprise Sales",
      revenue: numbers[0] || "N/A",
      history: ["Founded and expanded"],
      competitors: organizations.slice(1, 3)
    };
  } else if (entityType === "Technology" || entityType === "Programming Language") {
    base.technologyData = {
      inventor: people[0] || "Pioneers",
      launchYear: dates[0] || "N/A",
      architecture: ["Standard Architecture"],
      competitors: ["Alternative platforms"],
      evolution: ["Upgrades over time"],
      future: ["Ecosystem roadmap"]
    };
  } else if (entityType === "Country" || entityType === "City") {
    base.countryData = {
      capital: places[0] || "Unknown Capital",
      population: numbers[0] || "N/A",
      gdp: numbers[1] || "N/A",
      language: "Official Language",
      government: "Administration",
      economy: "Trade, services",
      bordering: places.slice(1, 4),
      mapLocation: "Continental Area"
    };
  } else if (entityType === "Book" || entityType === "Video Game" || entityType === "Artwork" || entityType === "Album" || entityType === "Song") {
    base.bookData = {
      author: people[0] || "Unknown",
      genre: subCategory,
      publisher: organizations[0] || "Publisher",
      releaseDate: dates[0] || "N/A",
      themes: ["Artistic Themes"],
      plotSummary: description
    };
  } else if (entityType === "Organization") {
    base.organizationData = {
      founder: people[0] || "Founders",
      type: "Association",
      headquarters: places[0] || "HQ Location",
      members: places.slice(1, 3),
      purpose: "Public Advocacy",
      history: ["Chartered and expanded"]
    };
  } else if (entityType === "Historical Event" || entityType === "War" || entityType === "Empire" || entityType === "Civilization" || entityType === "Space Mission") {
    base.historyData = {
      timeline,
      causes: ["Geopolitical shifts"],
      majorEvents: ["Key Turning Point"],
      consequences: ["Treaties and aftermath"],
      importantPeople: people.slice(0, 3),
      geography: places.slice(0, 3),
      legacy: ["Global geopolitical alignments"]
    };
  } else {
    base.scienceData = {
      formula: "E = mc² (Equivalent)",
      discovery: dates[0] || "N/A",
      discoverer: people[0] || "Pioneering scientists",
      applications: ["Industrial applications"],
      limitations: ["Boundary conditions"],
      currentResearch: ["Unsolved questions"]
    };
  }

  return base;
}
