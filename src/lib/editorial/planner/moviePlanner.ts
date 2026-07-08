import type { TopicKnowledge } from "@/types/wiki";

export function getMoviePlannerPrompt(knowledge: TopicKnowledge): string {
  const data = knowledge.movieData || {
    director: "Unknown",
    cast: [],
    genre: "Creative Work",
    themes: [],
    plot: ""
  };
  
  return `You are a Film Critic and Editorial Director for a premium publication like The New York Times.
Design the editorial outline of exactly 5 chronological chapters for the movie/work "${knowledge.common.title}".
Category: Movie / TV Series / Creative Work (Genre: ${data.genre})
Director: ${data.director}
Cast: ${data.cast.slice(0, 4).join(", ")}
Themes: ${data.themes.join(", ")}

Select exactly 5 active headlines (perspectiveTitle, 2-5 words) and custom chapter labels (referenceLabel) that sequentially tell the story of the production, plot, and themes.
Structure the outline with these exact questions and storyline themes:
- Chapter 1: Why was this movie made? (Inspiration, pre-production, development)
- Chapter 2: What is the story? (Core narrative setup, NO spoilers unless unavoidable)
- Chapter 3: Who made it? (Director's vision, casting, production style, key performances)
- Chapter 4: Themes and symbolism (Analysis of metaphors, themes, cinematography, score)
- Chapter 5: Reception and legacy (Box office, awards, impact on pop culture, lasting footprint)

Requirements:
1. Never use generic labels like 'Origins', 'Dynamics', 'Evolution', 'Legacy', 'Significance', 'Overview', 'History', 'Background', 'Developments'.
2. Custom chapter labels must be specific to this film (e.g. "Director's Vision", "Dream World", "Spinning Top").
3. Chapter titles (perspectiveTitle) must be active magazine headlines (max 5 words).

Return valid JSON with this schema:
{
  "cards": [
    {
      "readerQuestion": "The exact reader question mapped to this chapter (e.g. 'Why was this movie made?')",
      "perspectiveTitle": "Headline, 2-5 words",
      "referenceLabel": "Custom subject-specific label, 2-5 words",
      "factsToUse": "Comma-separated list of facts unique to this perspective",
      "factsToAvoid": "Comma-separated list of facts to avoid to prevent duplicate overlap with other perspectives"
    }
  ]
}`;
}
