import type { RelatedArticle } from "@/types/wiki";

export interface EntityClassification {
  entityType: string;
  confidence: number;
  subCategory: string;
  ontologyLabels: string[];
}

const SUPPORTED_ENTITIES = [
  "Movie",
  "TV Series",
  "Person",
  "Historical Event",
  "War",
  "Empire",
  "Civilization",
  "Country",
  "City",
  "Organization",
  "Company",
  "Brand",
  "Technology",
  "Programming Language",
  "Scientific Concept",
  "Medical Condition",
  "Book",
  "Video Game",
  "Space Mission",
  "Animal",
  "Artwork",
  "Musical Artist",
  "Album",
  "Song",
  "Religion",
  "Philosophy",
  "Mathematical Concept"
];

export async function classifyEntity(
  topicKey: string,
  article: {
    title: string;
    description?: string;
    categories?: string[];
    lead?: string;
    wikitext?: string;
  }
): Promise<EntityClassification> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const wikitextSnippet = article.wikitext ? article.wikitext.slice(0, 4000) : "";
      const categoriesText = (article.categories || []).join(", ");

      const prompt = `You are an expert taxonomist and knowledge engineer. Classify the following Wikipedia topic into exactly one of the supported entity types:
${SUPPORTED_ENTITIES.join(", ")}

Topic details:
- Title: ${article.title}
- Description: ${article.description || ""}
- Categories: ${categoriesText}
- Lead Paragraph: ${article.lead || ""}
- Wikitext Snippet (contains infobox if available):
${wikitextSnippet}

Analyze these details (especially the infobox name and categories) to determine the class.
Return a valid JSON object matching this schema:
{
  "entityType": "One of the supported entity types listed above",
  "confidence": 0.98,
  "subCategory": "A descriptive sub-genre or sub-type, e.g. 'Science Fiction', 'Cold War', 'Quantum Physics'",
  "ontologyLabels": [
    "Primary Entity Type",
    "Subcategory or Genre",
    "Key attribute (e.g. Year, Director, Developer, Era, Location, or Founder if available)"
  ]
}

Ensure ontologyLabels has exactly 2 to 4 strings representing a summary path. e.g. for Inception: ["Movie", "Science Fiction", "2010", "Christopher Nolan"].
Do not return markdown formatting blocks. Just return raw JSON starting with { and ending with }.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.1, maxOutputTokens: 250 },
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      const parsed = JSON.parse(text) as EntityClassification;

      if (SUPPORTED_ENTITIES.includes(parsed.entityType)) {
        return parsed;
      }
    } catch (e) {
      console.warn("Gemini entity classification failed, falling back to heuristics", e);
    }
  }

  return runHeuristicClassification(article);
}

function runHeuristicClassification(article: {
  title: string;
  description?: string;
  categories?: string[];
  lead?: string;
}): EntityClassification {
  const combinedText = `${article.title} ${article.description || ""} ${(article.categories || []).join(" ")} ${article.lead || ""}`.toLowerCase();

  let entityType = "Scientific Concept"; // Default fallback
  let subCategory = "General";
  let ontologyLabels = ["Concept", "General"];

  if (combinedText.includes("film") || combinedText.includes("movie") || combinedText.includes("cinema")) {
    entityType = "Movie";
    subCategory = "Film";
    ontologyLabels = ["Movie", "Cinema"];
  } else if (combinedText.includes("television series") || combinedText.includes("tv series") || combinedText.includes("sitcom")) {
    entityType = "TV Series";
    subCategory = "Television";
    ontologyLabels = ["TV Series", "Television"];
  } else if (combinedText.includes("births") || combinedText.includes("deaths") || combinedText.includes("people") || combinedText.includes("biography") || combinedText.includes("politician") || combinedText.includes("physicist") || combinedText.includes("philosopher") || combinedText.includes("artist")) {
    entityType = "Person";
    subCategory = "Biography";
    ontologyLabels = ["Person", "Biography"];
  } else if (combinedText.includes("war ") || combinedText.includes("battle of") || combinedText.includes("military conflict")) {
    entityType = "War";
    subCategory = "Military History";
    ontologyLabels = ["War", "Military History"];
  } else if (combinedText.includes("empire") || combinedText.includes("dynasty") || combinedText.includes("ancient rome")) {
    entityType = "Empire";
    subCategory = "Ancient History";
    ontologyLabels = ["Empire", "Ancient History"];
  } else if (combinedText.includes("civilization") || combinedText.includes("archaeological")) {
    entityType = "Civilization";
    subCategory = "Archaeology";
    ontologyLabels = ["Civilization", "History"];
  } else if (combinedText.includes("country") || combinedText.includes("sovereign state") || combinedText.includes("republic")) {
    entityType = "Country";
    subCategory = "Geography";
    ontologyLabels = ["Country", "Geography"];
  } else if (combinedText.includes("city") || combinedText.includes("capital") || combinedText.includes("town") || combinedText.includes("municipality")) {
    entityType = "City";
    subCategory = "Geography";
    ontologyLabels = ["City", "Geography"];
  } else if (combinedText.includes("company") || combinedText.includes("corporation") || combinedText.includes("conglomerate")) {
    entityType = "Company";
    subCategory = "Business";
    ontologyLabels = ["Company", "Business"];
  } else if (combinedText.includes("brand") || combinedText.includes("trademark")) {
    entityType = "Brand";
    subCategory = "Commerce";
    ontologyLabels = ["Brand", "Commerce"];
  } else if (combinedText.includes("programming language") || combinedText.includes("python") || combinedText.includes("compiler")) {
    entityType = "Programming Language";
    subCategory = "Software Development";
    ontologyLabels = ["Programming Language", "Software Development"];
  } else if (combinedText.includes("software") || combinedText.includes("technology") || combinedText.includes("operating system") || combinedText.includes("internet protocol")) {
    entityType = "Technology";
    subCategory = "Information Technology";
    ontologyLabels = ["Technology", "Computing"];
  } else if (combinedText.includes("novel") || combinedText.includes("book") || combinedText.includes("literature") || combinedText.includes("fiction book")) {
    entityType = "Book";
    subCategory = "Literature";
    ontologyLabels = ["Book", "Literature"];
  } else if (combinedText.includes("video game") || combinedText.includes("gameplay") || combinedText.includes("nintendo") || combinedText.includes("playstation")) {
    entityType = "Video Game";
    subCategory = "Gaming";
    ontologyLabels = ["Video Game", "Interactive Entertainment"];
  } else if (combinedText.includes("space mission") || combinedText.includes("apollo") || combinedText.includes("spaceflight") || combinedText.includes("spacecraft")) {
    entityType = "Space Mission";
    subCategory = "Space Exploration";
    ontologyLabels = ["Space Mission", "Space Exploration"];
  } else if (combinedText.includes("animal") || combinedText.includes("species of") || combinedText.includes("mammal") || combinedText.includes("dinosaur")) {
    entityType = "Animal";
    subCategory = "Zoology";
    ontologyLabels = ["Animal", "Biology"];
  } else if (combinedText.includes("painting") || combinedText.includes("artwork") || combinedText.includes("sculpture")) {
    entityType = "Artwork";
    subCategory = "Art History";
    ontologyLabels = ["Artwork", "Fine Art"];
  } else if (combinedText.includes("album") || combinedText.includes("record")) {
    entityType = "Album";
    subCategory = "Music";
    ontologyLabels = ["Album", "Music"];
  } else if (combinedText.includes("song") || combinedText.includes("single")) {
    entityType = "Song";
    subCategory = "Music";
    ontologyLabels = ["Song", "Music"];
  } else if (combinedText.includes("religion") || combinedText.includes("christianity") || combinedText.includes("islam") || combinedText.includes("buddhism")) {
    entityType = "Religion";
    subCategory = "Theology";
    ontologyLabels = ["Religion", "Theology"];
  } else if (combinedText.includes("philosophy") || combinedText.includes("existentialism") || combinedText.includes("rationalism")) {
    entityType = "Philosophy";
    subCategory = "Philosophy";
    ontologyLabels = ["Philosophy", "Humanities"];
  } else if (combinedText.includes("mathematical") || combinedText.includes("theorem") || combinedText.includes("equation") || combinedText.includes("calculus")) {
    entityType = "Mathematical Concept";
    subCategory = "Mathematics";
    ontologyLabels = ["Mathematical Concept", "Mathematics"];
  } else if (combinedText.includes("historical event") || combinedText.includes("revolution of") || combinedText.includes("treaty of")) {
    entityType = "Historical Event";
    subCategory = "History";
    ontologyLabels = ["Historical Event", "History"];
  } else if (combinedText.includes("disease") || combinedText.includes("medical condition") || combinedText.includes("syndrome") || combinedText.includes("cancer")) {
    entityType = "Medical Condition";
    subCategory = "Medicine";
    ontologyLabels = ["Medical Condition", "Healthcare"];
  }

  return {
    entityType,
    confidence: 0.6,
    subCategory,
    ontologyLabels
  };
}
