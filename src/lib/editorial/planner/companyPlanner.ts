import type { TopicKnowledge } from "@/types/wiki";

export function getCompanyPlannerPrompt(knowledge: TopicKnowledge): string {
  const data = knowledge.companyData || {
    founder: "Unknown",
    industry: "Business",
    headquarters: "Unknown",
    products: [],
    revenue: "Unknown"
  };

  return `You are a Business Journalist and Editor for a publication like Forbes, Bloomberg, or The Wall Street Journal.
Design the editorial outline of exactly 5 chronological chapters for the company "${knowledge.common.title}".
Founder(s): ${data.founder}
Industry: ${data.industry}
Headquarters: ${data.headquarters}
Core Products: ${data.products.slice(0, 4).join(", ")}

Select exactly 5 active headlines (perspectiveTitle, 2-5 words) and custom chapter labels (referenceLabel) that sequentially tell the business history.
Structure the outline with these exact questions and storyline themes:
- Chapter 1: Founding (How did it start? The early garage days, key co-founders, seed capital, and initial vision)
- Chapter 2: Growth (How did it scale? Corporate expansion, IPO, public listing, revenue growth, and market domination)
- Chapter 3: Products (What did they build? Core product releases, innovations, and shifts in technology or business models)
- Chapter 4: Business (How do they run? Revenue models, market competitors, lawsuits, leadership changes, or corporate pivots)
- Chapter 5: Future (What is next? Future initiatives, AI integrations, acquisition roadmaps, and next-gen market challenges)

Requirements:
1. Never use generic labels like 'Origins', 'Dynamics', 'Evolution', 'Legacy', 'Significance', 'Overview', 'History', 'Background', 'Developments' literally. Customize them (e.g. "Garage Startup", "Macintosh Breakthrough", "Trillion Dollar Milestone", "Tim Cook Era").
2. Chapter titles (perspectiveTitle) must be active magazine headlines (max 5 words).

Return valid JSON with this schema:
{
  "cards": [
    {
      "readerQuestion": "The exact reader question mapped to this chapter (e.g. 'Founding')",
      "perspectiveTitle": "Headline, 2-5 words",
      "referenceLabel": "Custom subject-specific label, 2-5 words",
      "factsToUse": "Comma-separated list of facts unique to this perspective",
      "factsToAvoid": "Comma-separated list of facts to avoid to prevent duplicate overlap with other perspectives"
    }
  ]
}`;
}
