import type { TopicKnowledge } from "@/types/wiki";

export function getCountryPlannerPrompt(knowledge: TopicKnowledge): string {
  const data = knowledge.countryData || {
    capital: "Unknown",
    population: "Unknown",
    gdp: "Unknown",
    government: "Unknown",
    economy: "Unknown"
  };

  return `You are a Foreign Correspondent and Editor for The Economist or National Geographic.
Design the editorial outline of exactly 5 chronological chapters for the country/city "${knowledge.common.title}".
Capital: ${data.capital}
Government: ${data.government}
Economy Type: ${data.economy}

Select exactly 5 active headlines (perspectiveTitle, 2-5 words) and custom chapter labels (referenceLabel) that sequentially tell its story.
Structure the outline with these exact questions and storyline themes:
- Chapter 1: Historical Roots (What is the foundation? Early settlements, independence, founding documents, and critical historical eras)
- Chapter 2: Geographical Landscape (Where is it located? Bordering nations, key cities, geography, and resource nodes)
- Chapter 3: Political Structure & Governance (How is it governed? Political systems, legal structures, and major historical transitions)
- Chapter 4: Economic Engine (What drives the economy? Key industries, GDP factors, and global trade relationships)
- Chapter 5: Modern Culture & Global Role (What is its contemporary role? Culture, societal structure, international relations, and future hurdles)

Requirements:
1. Never use generic labels like 'Origins', 'Dynamics', 'Evolution', 'Legacy', 'Significance', 'Overview', 'History', 'Background', 'Developments' literally. Customize them (e.g. "Colonial Foundations", "Andean Geography", "Federal Structure", "Copper Export Engine").
2. Chapter titles (perspectiveTitle) must be active magazine headlines (max 5 words).

Return valid JSON with this schema:
{
  "cards": [
    {
      "readerQuestion": "The exact reader question mapped to this chapter (e.g. 'Historical Roots')",
      "perspectiveTitle": "Headline, 2-5 words",
      "referenceLabel": "Custom subject-specific label, 2-5 words",
      "factsToUse": "Comma-separated list of facts unique to this perspective",
      "factsToAvoid": "Comma-separated list of facts to avoid to prevent duplicate overlap with other perspectives"
    }
  ]
}`;
}
