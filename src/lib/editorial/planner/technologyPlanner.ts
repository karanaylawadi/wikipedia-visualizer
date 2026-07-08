import type { TopicKnowledge } from "@/types/wiki";

export function getTechnologyPlannerPrompt(knowledge: TopicKnowledge): string {
  const data = knowledge.technologyData || {
    inventor: "Pioneers",
    launchYear: "Unknown",
    architecture: [],
    competitors: []
  };

  return `You are a Technical Journalist and Editorial Director for Wired or MIT Technology Review.
Design the editorial outline of exactly 5 chronological chapters for the technology "${knowledge.common.title}".
Inventor/Creator: ${data.inventor}
Launch Year: ${data.launchYear}
Core Architecture: ${data.architecture.join(", ")}

Select exactly 5 active headlines (perspectiveTitle, 2-5 words) and custom chapter labels (referenceLabel) that sequentially explain the technology.
Structure the outline with these exact questions and storyline themes:
- Chapter 1: Problem (What problem does it solve? The environment before its invention, bottlenecks, and the initial breakthrough)
- Chapter 2: Architecture (How does it work? Code architecture, technical specifications, and system design)
- Chapter 3: Adoption (Who adopted it and how? Early users, growth curve, open-source or proprietary expansion, and corporate backing)
- Chapter 4: Evolution (How did it mature? Subsequent versions, major milestones, forkings, and improvements)
- Chapter 5: Future (Where is it going? Roadmap, next version features, challenges, and long-term tech ecosystem role)

Requirements:
1. Never use generic labels like 'Origins', 'Dynamics', 'Evolution', 'Legacy', 'Significance', 'Overview', 'History', 'Background', 'Developments' literally. Customize them (e.g. "Scripting Revolution", "Interpreted Design", "PyPI Ecosystem", "Guido's Handover").
2. Chapter titles (perspectiveTitle) must be active magazine headlines (max 5 words).

Return valid JSON with this schema:
{
  "cards": [
    {
      "readerQuestion": "The exact reader question mapped to this chapter (e.g. 'Problem')",
      "perspectiveTitle": "Headline, 2-5 words",
      "referenceLabel": "Custom subject-specific label, 2-5 words",
      "factsToUse": "Comma-separated list of facts unique to this perspective",
      "factsToAvoid": "Comma-separated list of facts to avoid to prevent duplicate overlap with other perspectives"
    }
  ]
}`;
}
