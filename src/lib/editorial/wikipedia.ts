import type { RelatedArticle, WikiResult } from "@/types/wiki";

export type ArticleIntelligence = WikiResult & {
  lead: string;
  sectionHeadings: string[];
  wikitext: string;
  links: Array<{ title: string; description?: string }>;
  categories: string[];
};

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{
      title?: string;
    }>;
  };
};

type WikipediaSummaryResponse = {
  title?: string;
  extract?: string;
  description?: string;
  thumbnail?: WikiResult["thumbnail"];
  content_urls?: WikiResult["content_urls"];
  timestamp?: string;
  lang?: string;
};

const RELATED_TOPIC_KEYWORDS = [
  "war",
  "battle",
  "empire",
  "dynasty",
  "city",
  "capital",
  "republic",
  "king",
  "queen",
  "emperor",
  "president",
  "leader",
  "church",
  "university",
  "museum",
  "treaty",
  "century",
  "era",
  "revolution",
  "state",
  "nation",
  "civilization",
  "government",
  "parliament",
  "kingdom",
  "army",
  "religion",
  "law",
  "economy",
  "island",
  "river",
  "mountain",
  "desert",
  "ocean",
  "country",
  "province",
  "district",
  "settlement",
];

function normalizeTitleText(title: string) {
  return title.replace(/^the\s+/i, "").trim();
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function countOccurrences(text: string, title: string) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}\\b`, "gi");
  return (text.match(pattern) || []).length;
}

function isAdministrativeTopic(title: string, description?: string) {
  const normalizedTitle = normalizeTitleText(title).toLowerCase();
  const combined = `${normalizedTitle} ${description || ""}`.toLowerCase();

  return /\b(author|writer|editor|publication|journal|essay|poem|novel|play|album|film|series|reference|references|bibliography|maintenance|year|years|month|months|day|days|date|dates|template|portal|category|special|help|file|user|talk|isbn|citation|wikipedia)\b/.test(
    combined
  );
}

function isRecognizableRelatedTopic(title: string, description?: string) {
  const normalizedTitle = normalizeTitleText(title);
  const combined = `${normalizedTitle} ${description || ""}`.toLowerCase();

  if (!normalizedTitle || normalizedTitle.length < 3) return false;

  if (
    /^(list of|category:|portal:|template:|wikipedia:|special:|help:|file:|user:|talk:|book:|isbn|citation|template|category)/i.test(
      normalizedTitle
    )
  ) {
    return false;
  }

  if (isAdministrativeTopic(normalizedTitle, description)) {
    return false;
  }

  const score =
    (description ? 2 : 0) +
    (RELATED_TOPIC_KEYWORDS.some((keyword) => combined.includes(keyword))
      ? 3
      : 0) +
    (normalizedTitle.split(/\s+/).length <= 3 ? 1 : 0);

  return score >= 2;
}

function getCategoryScore(title: string, categories: string[] = []) {
  const topicTokens = new Set(tokenize(title));

  return categories.reduce((score, category) => {
    const name = category.replace(/^Category:/i, "").toLowerCase();
    const overlap = tokenize(name).filter((token) =>
      topicTokens.has(token)
    ).length;

    return score + overlap;
  }, 0);
}

async function getCanonicalWikipediaTitle(query: string) {
  const searchResponse = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&format=json&origin=*&srlimit=1`
  );

  if (!searchResponse.ok) return null;

  const searchData = (await searchResponse.json()) as WikipediaSearchResponse;
  const title = searchData.query?.search?.[0]?.title;

  return title || null;
}

export async function searchWikipedia(
  query: string
): Promise<WikiResult | null> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) return null;

  try {
    const canonicalTitle =
      (await getCanonicalWikipediaTitle(trimmedQuery)) || trimmedQuery;

    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        canonicalTitle
      )}`
    );

    if (!response.ok) return null;

    const data = (await response.json()) as WikipediaSummaryResponse;

    if (!data.title || !data.extract) return null;

    return {
      title: data.title,
      extract: data.extract,
      description: data.description,
      thumbnail: data.thumbnail,
      content_urls: data.content_urls,
      timestamp: data.timestamp,
      lang: data.lang,
    };
  } catch (error) {
    console.error("Wikipedia search failed:", error);
    return null;
  }
}

export async function getArticleIntelligence(
  query: string
): Promise<ArticleIntelligence | null> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) return null;

  try {
    const canonicalTitle =
      (await getCanonicalWikipediaTitle(trimmedQuery)) || trimmedQuery;

    const [summaryResponse, parseResponse] = await Promise.all([
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
          canonicalTitle
        )}&prop=extracts|links|categories|pageimages|description&explaintext=1&redirects=1&pllimit=100&cllimit=50&format=json&origin=*&plnamespace=0&clshow=!hidden&pithumbsize=1200&piprop=thumbnail`
      ),
      fetch(
        `https://en.wikipedia.org/w/api.php?action=parse&format=json&origin=*&page=${encodeURIComponent(
          canonicalTitle
        )}&prop=sections|wikitext`
      ),
    ]);

    if (!summaryResponse.ok || !parseResponse.ok) return null;

    const summaryData = await summaryResponse.json();
    const parseData = await parseResponse.json();

    const page = Object.values(summaryData.query?.pages || {})[0] as {
      title?: string;
      extract?: string;
      description?: string;
      thumbnail?: WikiResult["thumbnail"];
      content_urls?: WikiResult["content_urls"];
      timestamp?: string;
      lang?: string;
      links?: Array<{ title: string; description?: string }>;
      categories?: Array<{ title: string }>;
      missing?: boolean;
    };

    if (!page || page.missing) return null;

    const articleExtract = typeof page.extract === "string" ? page.extract : "";

    const paragraphs = articleExtract
      .split(/\n{2,}/)
      .map((entry: string) => entry.trim())
      .filter(Boolean);

    const lead = paragraphs[0] || articleExtract;

    const sectionHeadings = Array.isArray(parseData.parse?.sections)
      ? parseData.parse.sections
          .map((section: { line?: string }) => section.line)
          .filter((line: string | undefined): line is string => Boolean(line))
      : [];

    const wikitext =
      typeof parseData.parse?.wikitext?.["*"] === "string"
        ? parseData.parse.wikitext["*"]
        : "";

    const links = Array.isArray(page.links)
      ? page.links
          .filter((link) => typeof link?.title === "string")
          .map((link) => ({
            title: link.title,
            description: link.description,
          }))
      : [];

    const categories = Array.isArray(page.categories)
      ? page.categories
          .map((category) => category.title)
          .filter((title: string | undefined): title is string =>
            Boolean(title)
          )
      : [];

    return {
      title: page.title || canonicalTitle,
      extract: articleExtract,
      description: page.description,
      thumbnail: page.thumbnail,
      content_urls: page.content_urls,
      timestamp: page.timestamp,
      lang: page.lang,
      lead,
      sectionHeadings,
      wikitext,
      links,
      categories,
    };
  } catch (error) {
    console.error("Wikipedia article intelligence failed:", error);
    return null;
  }
}

export async function getRelatedArticles(
  query: string
): Promise<RelatedArticle[]> {
  const article = await getArticleIntelligence(query);

  if (!article) return [];

  const fullText = `${article.extract} ${article.lead} ${
    article.description || ""
  }`;
  const leadText = article.lead || "";
  const wikitext = article.wikitext || "";
  const sectionText = (article.sectionHeadings || []).join(" ");
  const infoboxScoreText = wikitext.slice(0, 5000);

  const scored = article.links
    .filter((link) => isRecognizableRelatedTopic(link.title, link.description))
    .map((link) => {
      let score = 0;

      // 1. Title match in lead text
      const termOccurrencesInLead = countOccurrences(leadText, link.title);
      score += termOccurrencesInLead * 15;

      // 2. Exact match check in body
      const occurrencesInBody = countOccurrences(fullText, link.title);
      score += occurrencesInBody * 4;

      // 3. Category match scores
      const categoriesScore = getCategoryScore(link.title, article.categories);
      score += categoriesScore * 6;

      // 4. Section headings overlap
      const headingsScore = getCategoryScore(link.title, article.sectionHeadings);
      score += headingsScore * 10;

      // 5. Infobox first mention bonus
      if (infoboxScoreText.includes(link.title)) {
        score += 20;
      }

      // 6. Section matching text bonus
      if (sectionText.includes(link.title)) {
        score += 8;
      }

      return {
        title: link.title,
        description: link.description,
        score,
      };
    });

  // Sort and deduplicate
  const uniqueScoredMap = new Map<string, typeof scored[number]>();
  for (const item of scored) {
    const existing = uniqueScoredMap.get(item.title);
    if (!existing || existing.score < item.score) {
      uniqueScoredMap.set(item.title, item);
    }
  }

  const sortedUnique = Array.from(uniqueScoredMap.values())
    .filter((item) => item.score > 2)
    .sort((a, b) => b.score - a.score);

  return sortedUnique.slice(0, 20).map((item) => ({
    title: item.title,
    description: item.description,
  }));
}
