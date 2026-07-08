import type { TopicKnowledge } from "@/types/wiki";

export function getPersonPlannerPrompt(knowledge: TopicKnowledge): string {
  const data = knowledge.personData || {
    occupation: "Individual",
    birth: "Unknown",
    death: "Unknown",
    majorWorks: [],
    legacy: []
  };

  return `You are a Premium Biographer and Editor for a publication like The New Yorker or Encyclopaedia Britannica.
Design the editorial outline of exactly 5 chronological chapters for the biography of "${knowledge.common.title}".
Occupation: ${data.occupation}
Lifespan: ${data.birth} - ${data.death}
Major Works: ${data.majorWorks.slice(0, 4).join(", ")}

Select exactly 5 active headlines (perspectiveTitle, 2-5 words) and custom chapter labels (referenceLabel) that sequentially tell their life.
Structure the outline with these exact questions and storyline themes:
- Chapter 1: Early Life (What shaped their early years? Birth, family, education, early influences)
- Chapter 2: Career (How did they rise to prominence? Professional beginnings, early accomplishments, breakthrough years)
- Chapter 3: Greatest Achievement (What is their most significant work or contribution? Peak achievement and main legacy builder)
- Chapter 4: Challenges (What obstacles did they face? Rivalries, controversies, health issues, or professional struggles)
- Chapter 5: Legacy (Why do we still remember them? Historical influence, awards, posthumous reputation, and modern relevance)

Requirements:
1. Never use generic labels like 'Origins', 'Dynamics', 'Evolution', 'Legacy', 'Significance', 'Overview', 'History', 'Background', 'Developments' literally. Customize them (e.g. "Patent Clerk Dreams", "General Theory of Relativity", "Fleeing the Nazi Regime").
2. Chapter titles (perspectiveTitle) must be active magazine headlines (max 5 words).

Return valid JSON with this schema:
{
  "cards": [
    {
      "readerQuestion": "The exact reader question mapped to this chapter (e.g. 'Early Life')",
      "perspectiveTitle": "Headline, 2-5 words",
      "referenceLabel": "Custom subject-specific label, 2-5 words",
      "factsToUse": "Comma-separated list of facts unique to this perspective",
      "factsToAvoid": "Comma-separated list of facts to avoid to prevent duplicate overlap with other perspectives"
    }
  ]
}`;
}
