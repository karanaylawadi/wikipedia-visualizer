import { getCachedStage, setCachedStage } from "./cache";
import type { TopicKnowledge } from "@/types/wiki";

export interface RelatedTopic {
  title: string;
  description: string;
  thumbnail: string | null;
  category: string;
}

function cleanAndTokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function computeSimilarityScore(
  item: RelatedTopic,
  knowledge: TopicKnowledge
): number {
  const text = `${item.title} ${item.description}`.toLowerCase();
  let score = 0;

  // 1. Basic token overlap with original title and brief description
  const topicTokens = cleanAndTokenize(`${knowledge.common.title} ${knowledge.common.description}`);
  const itemTokens = cleanAndTokenize(text);
  for (const token of itemTokens) {
    if (topicTokens.has(token)) score += 3.0;
  }

  // 2. Exact match with ontology path labels
  for (const label of knowledge.ontologyLabels) {
    if (text.includes(label.toLowerCase())) {
      score += 5.0;
    }
  }

  // 3. Domain/Entity-type alignment boost
  const type = knowledge.entityType;
  const itemCat = item.category.toLowerCase();

  if (type === "Movie" || type === "TV Series") {
    if (itemCat.includes("movie") || itemCat.includes("tv") || text.includes("film") || text.includes("cinema") || text.includes("director") || text.includes("starring")) {
      score += 12.0;
    }
  } else if (type === "Person" || type === "Musical Artist") {
    if (itemCat.includes("person") || text.includes("born") || text.includes("biography") || text.includes("pioneer") || text.includes("scientist") || text.includes("artist")) {
      score += 12.0;
    }
  } else if (type === "Company" || type === "Brand" || type === "Organization") {
    if (itemCat.includes("company") || itemCat.includes("organization") || text.includes("revenue") || text.includes("founded") || text.includes("headquarters") || text.includes("corporate")) {
      score += 12.0;
    }
  } else if (type === "Historical Event" || type === "War" || type === "Empire" || type === "Civilization" || type === "Space Mission") {
    if (text.includes("war") || text.includes("battle") || text.includes("treaty") || text.includes("empire") || text.includes("history") || text.includes("revolution")) {
      score += 12.0;
    }
  } else if (type === "Technology" || type === "Programming Language") {
    if (text.includes("technology") || text.includes("software") || text.includes("programming") || text.includes("language") || text.includes("operating system") || text.includes("protocol")) {
      score += 12.0;
    }
  } else if (type === "Scientific Concept" || type === "Mathematical Concept" || type === "Medical Condition" || type === "Animal") {
    if (text.includes("science") || text.includes("discovery") || text.includes("formula") || text.includes("theory") || text.includes("biology") || text.includes("mathematics")) {
      score += 12.0;
    }
  }

  return score;
}

export async function curateRelatedExploration(
  topicKey: string,
  knowledge: TopicKnowledge
): Promise<RelatedTopic[]> {
  const cached = await getCachedStage(topicKey, "stage11-explored");
  if (cached) return (cached as { explored: RelatedTopic[] }).explored;

  const initialList = (knowledge.common.relatedTopics || []).slice(0, 20);
  if (initialList.length === 0) return [];

  let rawExplored: RelatedTopic[] = [];
  try {
    const detailsUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|description|categories&titles=${encodeURIComponent(initialList.join("|"))}&piprop=thumbnail&pithumbsize=120&origin=*`;
    const detailsRes = await fetch(detailsUrl, {
      headers: {
        "User-Agent": "WikipediaVisualizer/1.0 (contact: info@visualizer.wiki)"
      }
    });
    
    if (detailsRes.ok) {
      const detailsData = await detailsRes.json();
      const pages = detailsData.query?.pages || {};
      const pageMap = new Map<string, { description?: string; thumbnail?: string | null; category?: string }>();

      for (const key of Object.keys(pages)) {
        const page = pages[key];
        const title = String(page.title || "");
        const description = String(page.description || "");
        const thumbnail = page.thumbnail?.source || null;

        const categories: string[] = Array.isArray(page.categories)
          ? page.categories.map((c: { title?: string }) => String(c.title || "").toLowerCase())
          : [];
        
        let category = knowledge.entityType;
        const catText = categories.join(" ");

        if (catText.includes("film") || catText.includes("movie") || catText.includes("cinema")) {
          category = "Movie";
        } else if (catText.includes("novel") || catText.includes("book") || catText.includes("writer") || catText.includes("literature")) {
          category = "Book";
        } else if (catText.includes("people") || catText.includes("biography") || catText.includes("births") || catText.includes("deaths")) {
          category = "Person";
        } else if (catText.includes("city") || catText.includes("settlements") || catText.includes("towns")) {
          category = "City";
        } else if (catText.includes("company") || catText.includes("companies")) {
          category = "Company";
        }

        pageMap.set(title, { description, thumbnail, category });
      }

      rawExplored = initialList.map((title) => {
        const details = pageMap.get(title) || {};
        return {
          title,
          description: details.description || "Connected subject",
          thumbnail: details.thumbnail || null,
          category: details.category || knowledge.entityType,
        };
      });
    } else {
      rawExplored = initialList.map((title) => ({
        title,
        description: "Connected subject",
        thumbnail: null,
        category: knowledge.entityType,
      }));
    }
  } catch (e) {
    console.warn("Failed to retrieve explored details from Wikipedia", e);
    rawExplored = initialList.map((title) => ({
      title,
      description: "Connected subject",
      thumbnail: null,
      category: knowledge.entityType,
    }));
  }

  // Rank using our custom computeSimilarityScore
  const scoredExplored = rawExplored.map((item) => {
    const similarity = computeSimilarityScore(item, knowledge);
    return { item, similarity };
  });

  scoredExplored.sort((a, b) => b.similarity - a.similarity);

  const result = scoredExplored.slice(0, 10).map((r) => r.item);
  await setCachedStage(topicKey, "stage11-explored", { explored: result });
  return result;
}
