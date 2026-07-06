export interface StructuredFacts {
  title: string;
  subtitle: string;
  leadParagraph: string;
  categories: string[];
  majorSections: string[];
  relatedArticles: string[];
  importantDates: string[];
  extractSummary: string;
  statistics: string[];
  keyPeople: string[];
  locations: string[];
  organizations: string[];
}

export function extractStructuredFacts(
  articleSource: {
    title: string;
    description?: string;
    extract: string;
    lead?: string;
    sectionHeadings?: string[];
    categories?: string[];
  },
  related: Array<{ title: string; description?: string }>
): StructuredFacts {
  const paragraphs = articleSource.extract
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  
  const leadParagraph = articleSource.lead || paragraphs[0] || "";
  const extractSummary = paragraphs.slice(0, 5).join("\n");

  // Extract dates (e.g. 1945, 2026, 476 AD)
  const extractText = articleSource.extract;
  const yearMatches = Array.from(extractText.matchAll(/\b(1\d{3}|2\d{3}|[1-9]\d{1,2})\s*(ad|bc|ce|bce)?\b/gi)).map((m) => m[0]);
  const importantDates = Array.from(new Set(yearMatches)).slice(0, 10);

  // Extract statistics (numbers, percentages, currencies)
  const statMatches = Array.from(extractText.matchAll(/\b(\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?\s*(?:billion|million|trillion)?|\b\d{1,3}(?:,\d{3})+\b)\b/gi)).map((m) => m[0]);
  const statistics = Array.from(new Set(statMatches)).slice(0, 8);

  // Simple heuristic entity extractors (Capitalized names)
  const capitalizationMatches = Array.from(extractText.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g)).map((m) => m[0]);
  const uniqueEntities = Array.from(new Set(capitalizationMatches)).filter(
    (name) => name !== articleSource.title && !name.startsWith("The ")
  );

  // Heuristically divide entities
  const locations: string[] = [];
  const keyPeople: string[] = [];
  const organizations: string[] = [];

  const locationKeywords = ["City", "State", "River", "Mountain", "Sea", "Ocean", "Union", "Empire", "Carthage", "Rome", "America", "Europe", "Asia", "London", "Paris", "Washington"];
  const orgKeywords = ["Company", "Inc", "Co", "University", "Association", "Organization", "NASA", "Soviet", "Committee", "Party", "Senate", "Council"];

  for (const entity of uniqueEntities) {
    if (locationKeywords.some(kw => entity.includes(kw))) {
      if (locations.length < 5) locations.push(entity);
    } else if (orgKeywords.some(kw => entity.includes(kw))) {
      if (organizations.length < 5) organizations.push(entity);
    } else {
      // Typically person names
      if (keyPeople.length < 6) keyPeople.push(entity);
    }
  }

  return {
    title: articleSource.title,
    subtitle: articleSource.description || "",
    leadParagraph,
    categories: articleSource.categories || [],
    majorSections: articleSource.sectionHeadings || [],
    relatedArticles: related.map((r) => r.title),
    importantDates,
    extractSummary,
    statistics,
    keyPeople,
    locations,
    organizations,
  };
}
