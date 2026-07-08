import type { TopicKnowledge } from "@/types/wiki";

export function getHistoryPlannerPrompt(knowledge: TopicKnowledge): string {
  const data = knowledge.historyData || {
    causes: [],
    consequences: [],
    importantPeople: [],
    legacy: []
  };

  return `You are a Senior Historian and Editorial Director for a publication like National Geographic.
Design the editorial outline of exactly 5 chronological chapters for the historical topic "${knowledge.common.title}".
Category: History / Empire / Event / Civilization
Important Figures: ${data.importantPeople.slice(0, 4).join(", ")}
Themes/Causes: ${data.causes.join(", ")}

Select exactly 5 active headlines (perspectiveTitle, 2-5 words) and custom chapter labels (referenceLabel) that sequentially outline the history.
Structure the outline with these exact questions and storyline themes:
- Chapter 1: Origins (What started this? The root causes, historical backdrop, and build-up)
- Chapter 2: Timeline (What were the key moments? The chronologically sequential major events and milestones)
- Chapter 3: Turning Point (What changed everything? The single most pivotal breakthrough, battle, or crisis)
- Chapter 4: Consequences (What happened next? The immediate aftermath, fallouts, structural re-alignments, or peace treaties)
- Chapter 5: Legacy (Why does it still matter? Long-term historical footprint, modern relevance, and cultural memories)

Requirements:
1. Never use generic labels like 'Origins', 'Dynamics', 'Evolution', 'Legacy', 'Significance', 'Overview', 'History', 'Background', 'Developments' literally as the label. Customize them to this specific event (e.g. "Triggering Spark", "March on Rome", "Iron Curtain Falls").
2. Custom chapter labels must be specific to this subject.
3. Chapter titles (perspectiveTitle) must be active magazine headlines (max 5 words).

Return valid JSON with this schema:
{
  "cards": [
    {
      "readerQuestion": "The exact reader question mapped to this chapter (e.g. 'Origins')",
      "perspectiveTitle": "Headline, 2-5 words",
      "referenceLabel": "Custom subject-specific label, 2-5 words",
      "factsToUse": "Comma-separated list of facts unique to this perspective",
      "factsToAvoid": "Comma-separated list of facts to avoid to prevent duplicate overlap with other perspectives"
    }
  ]
}`;
}
