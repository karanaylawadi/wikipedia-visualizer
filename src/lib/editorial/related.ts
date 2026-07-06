import { getCachedStage, setCachedStage } from "./cache";
import type { Classification } from "./classifier";
import type { StructuredFacts } from "./facts";

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
  title: string,
  description: string,
  topicTokens: Set<string>,
  categoryTokens: Set<string>
): number {
  const itemTokens = cleanAndTokenize(`${title} ${description}`);
  let score = 0;
  for (const token of itemTokens) {
    if (topicTokens.has(token)) score += 3.0;
    if (categoryTokens.has(token)) score += 1.5;
  }
  return score;
}

export async function curateRelatedExploration(
  topicKey: string,
  structuredFacts: StructuredFacts,
  classification: Classification
): Promise<RelatedTopic[]> {
  const cached = await getCachedStage(topicKey, "stage11-explored");
  if (cached) return (cached as { explored: RelatedTopic[] }).explored;

  const initialList = structuredFacts.relatedArticles.slice(0, 20);
  if (initialList.length === 0) return [];

  // Query Wikipedia details in a single batch
  let rawExplored: RelatedTopic[] = [];
  try {
    const detailsUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|description|categories&titles=${encodeURIComponent(initialList.join("|"))}&piprop=thumbnail&pithumbsize=120&origin=*`;
    const detailsRes = await fetch(detailsUrl);
    
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
        let category = classification.category;

        const catText = categories.join(" ");
        if (catText.includes("film") || catText.includes("movie") || catText.includes("cinema")) {
          category = "Movie";
        } else if (catText.includes("novel") || catText.includes("book") || catText.includes("writer") || catText.includes("literature")) {
          category = "Book";
        } else if (catText.includes("people") || catText.includes("biography") || catText.includes("births") || catText.includes("deaths")) {
          category = "Person";
        } else if (catText.includes("city") || catText.includes("settlements") || catText.includes("towns")) {
          category = "City";
        }

        pageMap.set(title, { description, thumbnail, category });
      }

      rawExplored = initialList.map((title) => {
        const details = pageMap.get(title) || {};
        return {
          title,
          description: details.description || "Connected subject",
          thumbnail: details.thumbnail || null,
          category: details.category || classification.category,
        };
      });
    } else {
      rawExplored = initialList.map((title) => ({
        title,
        description: "Connected subject",
        thumbnail: null,
        category: classification.category,
      }));
    }
  } catch (e) {
    console.warn("Failed to retrieve explored details from Wikipedia", e);
    rawExplored = initialList.map((title) => ({
      title,
      description: "Connected subject",
      thumbnail: null,
      category: classification.category,
    }));
  }

  // Rank using code-based Jaccard similarity score
  const topicTokens = cleanAndTokenize(structuredFacts.title);
  const categoryTokens = cleanAndTokenize(`${classification.category} ${classification.subcategory}`);

  const scoredExplored = rawExplored.map((item) => {
    const similarity = computeSimilarityScore(item.title, item.description, topicTokens, categoryTokens);
    return { item, similarity };
  });

  // Sort descending by similarity score
  scoredExplored.sort((a, b) => b.similarity - a.similarity);

  const result = scoredExplored.slice(0, 10).map((r) => r.item);
  await setCachedStage(topicKey, "stage11-explored", { explored: result });
  return result;
}
