import type { TopicKnowledge } from "@/types/wiki";

export function getOrganizationPlannerPrompt(knowledge: TopicKnowledge): string {
  const data = knowledge.organizationData || {
    founder: "Pioneers",
    type: "Institution",
    headquarters: "Unknown",
    purpose: "Public Benefit"
  };

  return `You are a Global Affairs Journalist and Editor for a publication like Foreign Policy or Time.
Design the editorial outline of exactly 5 chronological chapters for the organization "${knowledge.common.title}".
Founders/Pioneers: ${data.founder}
Type: ${data.type}
Purpose: ${data.purpose}

Select exactly 5 active headlines (perspectiveTitle, 2-5 words) and custom chapter labels (referenceLabel) that sequentially tell its story.
Structure the outline with these exact questions and storyline themes:
- Chapter 1: Establishment (Why was it founded? The historical necessity, founding conference or charter, and early sponsors)
- Chapter 2: Core Purpose & Mission (What does it do? The primary objectives, operational charters, and structure)
- Chapter 3: Key Initiatives & Operations (How does it function? Key historic campaigns, achievements, treaties, or projects)
- Chapter 4: Institutional Impact (What is its global footprint? Structural adjustments, geopolitical alignment, or criticisms)
- Chapter 5: Future Horizons (What lies ahead? The modern roadmap, leadership shifts, funding issues, and future relevancy)

Requirements:
1. Never use generic labels like 'Origins', 'Dynamics', 'Evolution', 'Legacy', 'Significance', 'Overview', 'History', 'Background', 'Developments' literally. Customize them (e.g. "Post-War Charter", "Security Council Design", "Peacekeeping Operations", "Funding Controversies").
2. Chapter titles (perspectiveTitle) must be active magazine headlines (max 5 words).

Return valid JSON with this schema:
{
  "cards": [
    {
      "readerQuestion": "The exact reader question mapped to this chapter (e.g. 'Establishment')",
      "perspectiveTitle": "Headline, 2-5 words",
      "referenceLabel": "Custom subject-specific label, 2-5 words",
      "factsToUse": "Comma-separated list of facts unique to this perspective",
      "factsToAvoid": "Comma-separated list of facts to avoid to prevent duplicate overlap with other perspectives"
    }
  ]
}`;
}
