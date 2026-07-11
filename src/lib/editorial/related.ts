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
  // 1. entity_overlap: shares words/entities
  const topicTitleWords = cleanAndTokenize(knowledge.common.title);
  const itemTitleWords = cleanAndTokenize(item.title);
  let matchingTitleWords = 0;
  itemTitleWords.forEach(w => {
    if (topicTitleWords.has(w)) matchingTitleWords++;
  });
  const entity_overlap = matchingTitleWords > 0 ? 1.0 : 0.0;

  // 2. wikipedia_links_overlap: if it's linked in the main topic's text
  const isLinked = (knowledge.common.description || "").toLowerCase().includes(item.title.toLowerCase());
  const wikipedia_links_overlap = isLinked ? 1.0 : 0.0;

  // 3. description_overlap: does the candidate's own description share
  // vocabulary with the source topic's description — a real signal about
  // subject-matter closeness, independent of list position.
  const topicDescWords = cleanAndTokenize(knowledge.common.description || "");
  const itemDescWords = cleanAndTokenize(item.description || "");
  let matchingDescWords = 0;
  itemDescWords.forEach((w) => {
    if (w.length > 3 && topicDescWords.has(w)) matchingDescWords++;
  });
  const description_overlap = Math.min(1.0, matchingDescWords / 3);

  // 4. popularity: length of description as proxy for content depth
  const popularity = Math.min(1.0, item.description.length / 100);

  // Previous formula included a `graph_proximity` term that checked
  // whether a candidate's title appeared in the same list it was drawn
  // from — true by construction for every candidate, contributing a
  // constant to every score and providing zero differentiation
  // (V17_FORENSIC_AUDIT.md, Bug #10). Replaced with description_overlap,
  // a real signal, and weights rebalanced across the three genuine
  // differentiators plus popularity.
  const score = entity_overlap * 0.35 + wikipedia_links_overlap * 0.25 + description_overlap * 0.25 + popularity * 0.15;

  return score * 100;
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

  // Do not fill recommendation slots with weak matches — a topic with no
  // signal above the minimum bar is dropped rather than padded in to reach
  // a target count (CLAUDE.md related-topic rules; NON_NEGOTIABLES.md).
  const MIN_SCORE = 15;
  const result = scoredExplored
    .filter((r) => r.similarity >= MIN_SCORE)
    .slice(0, 10)
    .map((r) => r.item);

  await setCachedStage(topicKey, "stage11-explored", { explored: result });
  return result;
}
