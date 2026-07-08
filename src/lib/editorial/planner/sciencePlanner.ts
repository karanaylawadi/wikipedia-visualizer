import type { TopicKnowledge } from "@/types/wiki";

export function getSciencePlannerPrompt(knowledge: TopicKnowledge): string {
  const data = knowledge.scienceData || {
    discovery: "Modern Science",
    applications: [],
    limitations: []
  };

  return `You are a Science Writer and Editor for a publication like Scientific American, Nature, or Quanta Magazine.
Design the editorial outline of exactly 5 chronological chapters for the scientific concept "${knowledge.common.title}".
Discovery: ${data.discovery}
Applications: ${data.applications.slice(0, 4).join(", ")}
Limitations: ${data.limitations.join(", ")}

Select exactly 5 active headlines (perspectiveTitle, 2-5 words) and custom chapter labels (referenceLabel) that sequentially explain the concept.
Structure the outline with these exact questions and storyline themes:
- Chapter 1: Discovery (Who discovered it and when? The historical backdrop, key scientists, and initial breakthrough experiment)
- Chapter 2: How it works (What is the mechanism? The theoretical framework, main equations, formulas, or biological pathways)
- Chapter 3: Applications (How is it applied? Real-world technological use cases, medical treatments, or mathematical proofs)
- Chapter 4: Limitations (What are the constraints? Limits of the theory, experimental challenges, or criticisms)
- Chapter 5: Current research (What is next? Future experiments, modern breakthroughs, and unsolved problems)

Requirements:
1. Never use generic labels like 'Origins', 'Dynamics', 'Evolution', 'Legacy', 'Significance', 'Overview', 'History', 'Background', 'Developments' literally. Customize them (e.g. "Calvin Cycle Discovery", "Light Reactions", "RuBisCO Role", "Carbon Fixation Limits").
2. Chapter titles (perspectiveTitle) must be active magazine headlines (max 5 words).

Return valid JSON with this schema:
{
  "cards": [
    {
      "readerQuestion": "The exact reader question mapped to this chapter (e.g. 'Discovery')",
      "perspectiveTitle": "Headline, 2-5 words",
      "referenceLabel": "Custom subject-specific label, 2-5 words",
      "factsToUse": "Comma-separated list of facts unique to this perspective",
      "factsToAvoid": "Comma-separated list of facts to avoid to prevent duplicate overlap with other perspectives"
    }
  ]
}`;
}
