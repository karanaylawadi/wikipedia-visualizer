import type { TopicKnowledge } from "@/types/wiki";

export function getBookPlannerPrompt(knowledge: TopicKnowledge): string {
  const data = knowledge.bookData || {
    author: "Unknown",
    genre: "Literature",
    publisher: "Unknown",
    themes: [],
    plotSummary: ""
  };

  return `You are a Literary Critic and Editor for a publication like The New York Review of Books or The Guardian.
Design the editorial outline of exactly 5 chronological chapters for the book/work "${knowledge.common.title}".
Author: ${data.author}
Genre: ${data.genre}
Themes: ${data.themes.join(", ")}

Select exactly 5 active headlines (perspectiveTitle, 2-5 words) and custom chapter labels (referenceLabel) that sequentially outline the work.
Structure the outline with these exact questions and storyline themes:
- Chapter 1: Inspiration (Why was it written? Historical and personal context of the author, writing process)
- Chapter 2: Plot Summary (What is the narrative? Outline of major plot points and narrative structure, NO major spoilers)
- Chapter 3: Character Dynamics / Key Themes (Who are the key figures? Deep dive into characters, themes, and motifs)
- Chapter 4: Literary Style & Reception (How is it written? Author's prose style, release reception, reviews, and censorship history if any)
- Chapter 5: Lasting Legacy & Adaptations (Why does it still matter? Cultural footprint, movie adaptations, and literary influence)

Requirements:
1. Never use generic labels like 'Origins', 'Dynamics', 'Evolution', 'Legacy', 'Significance', 'Overview', 'History', 'Background', 'Developments' literally. Customize them (e.g. "Orwell's Warning", "Winston's Rebellion", "Big Brother Symbolism", "Nineteen Eighty-Four Legacy").
2. Chapter titles (perspectiveTitle) must be active magazine headlines (max 5 words).

Return valid JSON with this schema:
{
  "cards": [
    {
      "readerQuestion": "The exact reader question mapped to this chapter (e.g. 'Inspiration')",
      "perspectiveTitle": "Headline, 2-5 words",
      "referenceLabel": "Custom subject-specific label, 2-5 words",
      "factsToUse": "Comma-separated list of facts unique to this perspective",
      "factsToAvoid": "Comma-separated list of facts to avoid to prevent duplicate overlap with other perspectives"
    }
  ]
}`;
}
