import { getCachedStage, setCachedStage } from "./cache";
import type { TopicKnowledge } from "@/types/wiki";
import type { CardPlan } from "./planner";

export interface ChapterFactAssignment {
  facts: string[];
  anchors: string[];
}

export type TopicFactAssignment = Record<number, ChapterFactAssignment>;

export async function assignFactsToChapters(
  topicKey: string,
  knowledge: TopicKnowledge,
  plan: { cards: CardPlan[] }
): Promise<TopicFactAssignment> {
  const cached = await getCachedStage(topicKey, "facts");
  if (cached) {
    return cached as TopicFactAssignment;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  let rawAssignment: TopicFactAssignment = {
    0: { facts: [], anchors: [] },
    1: { facts: [], anchors: [] },
    2: { facts: [], anchors: [] },
    3: { facts: [], anchors: [] },
    4: { facts: [], anchors: [] }
  };

  if (apiKey && plan.cards && plan.cards.length === 5) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are a Senior Editorial Director. Assign unique facts and concrete anchors from the TopicKnowledge object to each of the 5 planned chapters.

Chapters:
${plan.cards.map((c, i) => `Chapter ${i + 1}: ${c.referenceLabel} - "${c.perspectiveTitle}" (${c.readerQuestion})`).join("\n")}

TopicKnowledge fields:
- Summary Facts: ${JSON.stringify(knowledge.summaryFacts)}
- People: ${JSON.stringify(knowledge.people)}
- Places: ${JSON.stringify(knowledge.places)}
- Organizations: ${JSON.stringify(knowledge.organizations)}
- Events: ${JSON.stringify(knowledge.events)}
- Dates: ${JSON.stringify(knowledge.dates)}
- Numbers: ${JSON.stringify(knowledge.numbers)}
- Works: ${JSON.stringify(knowledge.works)}
- Inventions: ${JSON.stringify(knowledge.inventions)}

Requirements:
1. Assign exactly 2-4 unique facts (from Summary Facts) and exactly 2-4 concrete anchors (drawn from People, Places, Organizations, Events, Dates, Numbers, Works, or Inventions) to each chapter.
2. NO fact or anchor can be repeated across different chapters. Each chapter must use completely different details to ensure zero overlap.
3. Every chapter MUST have at least two concrete anchors.
4. Do not reuse the same person, place, date, organization, event, etc. in more than one chapter.

Return valid JSON with this exact schema (0-indexed matching the 5 chapters):
{
  "0": {
    "facts": ["Fact 1", "Fact 2"],
    "anchors": ["Anchor 1", "Anchor 2"]
  },
  "1": {
    "facts": ["Fact 3", "Fact 4"],
    "anchors": ["Anchor 3", "Anchor 4"]
  },
  "2": {
    "facts": ["Fact 5", "Fact 6"],
    "anchors": ["Anchor 5", "Anchor 6"]
  },
  "3": {
    "facts": ["Fact 7", "Fact 8"],
    "anchors": ["Anchor 7", "Anchor 8"]
  },
  "4": {
    "facts": ["Fact 9", "Fact 10"],
    "anchors": ["Anchor 9", "Anchor 10"]
  }
}
Do not return markdown formatting blocks. Just return raw JSON starting with { and ending with }.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { temperature: 0.1, maxOutputTokens: 1000 },
      });

      const text = typeof response.text === "string" ? response.text.replace(/```json|```/g, "").trim() : "";
      const parsed = JSON.parse(text);
      
      for (let i = 0; i < 5; i++) {
        if (parsed[i]) {
          rawAssignment[i] = {
            facts: Array.isArray(parsed[i].facts) ? parsed[i].facts : [],
            anchors: Array.isArray(parsed[i].anchors) ? parsed[i].anchors : []
          };
        }
      }
    } catch (e) {
      console.warn("Gemini fact assignment failed, falling back to programmatic assignment", e);
      rawAssignment = getFallbackProgrammaticAssignment(knowledge);
    }
  } else {
    rawAssignment = getFallbackProgrammaticAssignment(knowledge);
  }

  // Apply strict programmatic repair to guarantee rules:
  // 1. Every chapter has at least 2 anchors.
  // 2. Zero duplicated facts/anchors across chapters.
  const repairedAssignment = repairAssignments(rawAssignment, knowledge);

  await setCachedStage(topicKey, "facts", repairedAssignment);
  return repairedAssignment;
}

function getFallbackProgrammaticAssignment(knowledge: TopicKnowledge): TopicFactAssignment {
  const assignment: TopicFactAssignment = {
    0: { facts: [], anchors: [] },
    1: { facts: [], anchors: [] },
    2: { facts: [], anchors: [] },
    3: { facts: [], anchors: [] },
    4: { facts: [], anchors: [] }
  };

  // Divide summaryFacts
  const facts = knowledge.summaryFacts || [];
  for (let i = 0; i < 5; i++) {
    const start = i * 2;
    assignment[i].facts = facts.slice(start, start + 2);
  }

  return assignment;
}

export function repairAssignments(
  assignment: TopicFactAssignment,
  knowledge: TopicKnowledge
): TopicFactAssignment {
  const usedFacts = new Set<string>();
  const usedAnchors = new Set<string>();
  const repaired: TopicFactAssignment = {};

  const allPossibleAnchors = [
    ...(knowledge.dates || []),
    ...(knowledge.people || []),
    ...(knowledge.places || []),
    ...(knowledge.events || []),
    ...(knowledge.inventions || []),
    ...(knowledge.numbers || []),
    ...(knowledge.works || []),
    ...(knowledge.organizations || []),
  ].filter(Boolean);

  const normalize = (s: string) => s.toLowerCase().trim();

  // Step 1: Clean and deduplicate raw assignments
  for (let i = 0; i < 5; i++) {
    const rawChapter = assignment[i] || { facts: [], anchors: [] };
    const chapterFacts: string[] = [];
    const chapterAnchors: string[] = [];

    for (const f of rawChapter.facts || []) {
      const norm = normalize(f);
      if (!usedFacts.has(norm)) {
        usedFacts.add(norm);
        chapterFacts.push(f);
      }
    }

    for (const a of rawChapter.anchors || []) {
      const norm = normalize(a);
      if (!usedAnchors.has(norm)) {
        usedAnchors.add(norm);
        chapterAnchors.push(a);
      }
    }

    repaired[i] = { facts: chapterFacts, anchors: chapterAnchors };
  }

  // Step 2: Ensure each chapter has at least 2 anchors
  for (let i = 0; i < 5; i++) {
    const chap = repaired[i];
    while (chap.anchors.length < 2) {
      const unused = allPossibleAnchors.find(a => !usedAnchors.has(normalize(a)));
      if (unused) {
        usedAnchors.add(normalize(unused));
        chap.anchors.push(unused);
      } else {
        // Fallback anchors derived from title/description
        const fallbackAnchor = `${knowledge.title} detail part ${i + 1} (${chap.anchors.length + 1})`;
        chap.anchors.push(fallbackAnchor);
        usedAnchors.add(normalize(fallbackAnchor));
      }
    }
  }

  return repaired;
}
