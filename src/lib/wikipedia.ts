import type { RelatedArticle, WikiResult } from "@/types/wiki";

export type ArticleIntelligence = WikiResult & {
  lead: string;
  sectionHeadings: string[];
  wikitext: string;
  links: Array<{ title: string; description?: string }>;
  categories: string[];
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
  return /\b(author|writer|editor|publication|journal|essay|poem|novel|play|album|film|series|reference|references|bibliography|maintenance|year|years|month|months|day|days|date|dates|template|portal|category|special|help|file|user|talk|isbn|citation|wikipedia)\b/.test(combined);
}

function isRecognizableRelatedTopic(title: string, description?: string) {
  const normalizedTitle = normalizeTitleText(title);
  const combined = `${normalizedTitle} ${description || ""}`.toLowerCase();

  if (!normalizedTitle || normalizedTitle.length < 3) return false;
  if (/^(list of|category:|portal:|template:|wikipedia:|special:|help:|file:|user:|talk:|book:|isbn|citation|template|category)/i.test(normalizedTitle)) {
    return false;
  }
  if (isAdministrativeTopic(normalizedTitle, description)) {
    return false;
  }

  const score =
    (description ? 2 : 0) +
    (RELATED_TOPIC_KEYWORDS.some((keyword) => combined.includes(keyword)) ? 3 : 0) +
    (normalizedTitle.split(/\s+/).length <= 3 ? 1 : 0);

  return score >= 2;
}

function getCategoryScore(title: string, categories: string[] = []) {
  const topicTokens = new Set(tokenize(title));
  return categories.reduce((score, category) => {
    const name = category.replace(/^Category:/i, "").toLowerCase();
    const overlap = tokenize(name).filter((token) => topicTokens.has(token)).length;
    return score + overlap;
  }, 0);
}

export async function searchWikipedia(query: string): Promise<WikiResult | null> {
  if (!query.trim()) return null;

  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
  );

  if (!response.ok) return null;

  const data = await response.json();

  return {
    title: data.title,
    extract: data.extract,
    description: data.description,
    thumbnail: data.thumbnail,
    content_urls: data.content_urls,
    timestamp: data.timestamp,
    lang: data.lang,
  };
}

export async function getArticleIntelligence(query: string): Promise<ArticleIntelligence | null> {
  if (!query.trim()) return null;

  const [summaryResponse, parseResponse] = await Promise.all([
    fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=extracts|links|categories|pageimages|description&explaintext=1&redirects=1&pllimit=100&cllimit=50&format=json&origin=*&plnamespace=0&clshow=!hidden&pithumbsize=1200&piprop=thumbnail`
    ),
    fetch(
      `https://en.wikipedia.org/w/api.php?action=parse&format=json&origin=*&page=${encodeURIComponent(query)}&prop=sections|wikitext`
    ),
  ]);

  if (!summaryResponse.ok || !parseResponse.ok) return null;

  const summaryData = await summaryResponse.json();
  const parseData = await parseResponse.json();

  const page = Object.values(summaryData.query?.pages || {})[0] as any;
  if (!page) return null;

  const articleExtract = typeof page.extract === "string" ? page.extract : "";
  const paragraphs = articleExtract
    .split(/\n{2,}/)
    .map((entry: string) => entry.trim())
    .filter(Boolean);
  const lead = paragraphs[0] || articleExtract;
  const sectionHeadings = Array.isArray(parseData.parse?.sections)
    ? parseData.parse.sections
        .map((section: any) => section.line)
        .filter((line: string | undefined): line is string => Boolean(line))
    : [];
  const wikitext = typeof parseData.parse?.wikitext?.["*"] === "string" ? parseData.parse.wikitext["*"] : "";
  const links = Array.isArray(page.links)
    ? page.links
        .filter((link: any) => typeof link?.title === "string")
        .map((link: any) => ({ title: link.title, description: link.description }))
    : [];
  const categories = Array.isArray(page.categories)
    ? page.categories.map((category: any) => category.title).filter((title: string | undefined): title is string => Boolean(title))
    : [];

  return {
    title: page.title || query,
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
}

export async function getRelatedArticles(query: string): Promise<RelatedArticle[]> {
  const article = await getArticleIntelligence(query);
  if (!article) return [];

  const fullText = `${article.extract} ${article.lead} ${article.description || ""}`;
  const leadText = article.lead || "";
  const wikitext = article.wikitext || "";
  const sectionText = (article.sectionHeadings || []).join(" ");
  const infoboxScoreText = wikitext.slice(0, 5000);

  const scored = article.links
    .filter((link) => isRecognizableRelatedTopic(link.title, link.description))
    .map((link) => {
      const normalizedTitle = normalizeTitleText(link.title);
      const leadMentions = countOccurrences(leadText, normalizedTitle);
      const infoboxMentions = countOccurrences(infoboxScoreText, normalizedTitle);
      const sectionMentions = countOccurrences(sectionText, normalizedTitle);
      const internalLinkFrequency = countOccurrences(fullText, normalizedTitle);
      const categoryBoost = getCategoryScore(normalizedTitle, article.categories);
      const keywordBoost = RELATED_TOPIC_KEYWORDS.some((keyword) => `${normalizedTitle} ${link.description || ""}`.toLowerCase().includes(keyword)) ? 2 : 0;
      const lengthPenalty = normalizedTitle.split(/\s+/).length > 4 ? -1 : 0;
      const score = leadMentions * 6 + infoboxMentions * 4 + sectionMentions * 3 + internalLinkFrequency * 2 + categoryBoost * 2 + keywordBoost + lengthPenalty;

      return {
        title: link.title,
        description: link.description,
        thumbnail: undefined,
        score,
      };
    })
    .filter((item) => item.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ title, description }) => ({ title, description }));

  return scored;
}