import { getCachedStage, setCachedStage } from "./cache";
import type { TopicKnowledge } from "@/types/wiki";
import type { CardPlan } from "./planner";

export interface ChapterFactAssignment {
  facts: string[];
  anchors: string[];
}

export type TopicFactAssignment = Record<number, ChapterFactAssignment>;

interface FactPools {
  summaryFacts: string[];
  dates: string[];
  people: string[];
  places: string[];
  events: string[];
  inventions: string[];
  numbers: string[];
  works: string[];
  organizations: string[];
}

function getFactPools(knowledge: TopicKnowledge): FactPools {
  const summaryFacts = knowledge.common.summaryFacts || [];
  const dates: string[] = [];
  const people: string[] = [];
  const places: string[] = [];
  const events: string[] = [];
  const inventions: string[] = [];
  const numbers: string[] = [];
  const works: string[] = [];
  const organizations: string[] = [];

  if (knowledge.common.timeline) {
    for (const milestone of knowledge.common.timeline) {
      if (milestone.year) dates.push(milestone.year);
      if (milestone.event) events.push(milestone.event);
    }
  }

  if (knowledge.movieData) {
    const md = knowledge.movieData;
    if (md.director) people.push(md.director);
    if (md.producer) organizations.push(md.producer);
    if (md.cast) people.push(...md.cast);
    if (md.music) people.push(md.music);
    if (md.cinematography) people.push(md.cinematography);
    if (md.boxOffice) numbers.push(md.boxOffice);
    if (md.budget) numbers.push(md.budget);
  }

  if (knowledge.personData) {
    const pd = knowledge.personData;
    if (pd.birth) dates.push(pd.birth);
    if (pd.death) dates.push(pd.death);
    if (pd.majorWorks) works.push(...pd.majorWorks);
    if (pd.awards) works.push(...pd.awards);
  }

  if (knowledge.companyData) {
    const cd = knowledge.companyData;
    if (cd.founder) people.push(cd.founder);
    if (cd.headquarters) places.push(cd.headquarters);
    if (cd.products) inventions.push(...cd.products);
    if (cd.competitors) organizations.push(...cd.competitors);
    if (cd.revenue) numbers.push(cd.revenue);
  }

  if (knowledge.countryData) {
    const cnd = knowledge.countryData;
    if (cnd.capital) places.push(cnd.capital);
    if (cnd.bordering) places.push(...cnd.bordering);
    if (cnd.population) numbers.push(cnd.population);
    if (cnd.gdp) numbers.push(cnd.gdp);
  }

  if (knowledge.technologyData) {
    const td = knowledge.technologyData;
    if (td.inventor) people.push(td.inventor);
    if (td.launchYear) dates.push(td.launchYear);
    if (td.architecture) inventions.push(...td.architecture);
    if (td.competitors) inventions.push(...td.competitors);
  }

  if (knowledge.scienceData) {
    const sd = knowledge.scienceData;
    if (sd.discoverer) people.push(sd.discoverer);
    if (sd.discovery) dates.push(sd.discovery);
    if (sd.applications) inventions.push(...sd.applications);
    if (sd.formula) works.push(sd.formula);
  }

  if (knowledge.organizationData) {
    const od = knowledge.organizationData;
    if (od.founder) people.push(od.founder);
    if (od.headquarters) places.push(od.headquarters);
    if (od.members) places.push(...od.members);
  }

  if (knowledge.historyData) {
    const hd = knowledge.historyData;
    if (hd.importantPeople) people.push(...hd.importantPeople);
    if (hd.geography) places.push(...hd.geography);
    if (hd.majorEvents) events.push(...hd.majorEvents);
  }

  return {
    summaryFacts: summaryFacts.filter(Boolean),
    dates: Array.from(new Set(dates)).filter(Boolean),
    people: Array.from(new Set(people)).filter(Boolean),
    places: Array.from(new Set(places)).filter(Boolean),
    events: Array.from(new Set(events)).filter(Boolean),
    inventions: Array.from(new Set(inventions)).filter(Boolean),
    numbers: Array.from(new Set(numbers)).filter(Boolean),
    works: Array.from(new Set(works)).filter(Boolean),
    organizations: Array.from(new Set(organizations)).filter(Boolean),
  };
}

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

  const pools = getFactPools(knowledge);

  if (apiKey && plan.cards && plan.cards.length === 5) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are a Senior Editorial Director. Assign unique facts and concrete anchors from the TopicKnowledge object to each of the 5 planned chapters.

Chapters:
${plan.cards.map((c, i) => `Chapter ${i + 1}: ${c.referenceLabel} - "${c.perspectiveTitle}" (${c.readerQuestion})`).join("\n")}

TopicKnowledge fields:
- Summary Facts: ${JSON.stringify(pools.summaryFacts)}
- People: ${JSON.stringify(pools.people)}
- Places: ${JSON.stringify(pools.places)}
- Organizations: ${JSON.stringify(pools.organizations)}
- Events: ${JSON.stringify(pools.events)}
- Dates: ${JSON.stringify(pools.dates)}
- Numbers: ${JSON.stringify(pools.numbers)}
- Works: ${JSON.stringify(pools.works)}
- Inventions: ${JSON.stringify(pools.inventions)}

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

  const pools = getFactPools(knowledge);
  const facts = pools.summaryFacts || [];
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

  const pools = getFactPools(knowledge);

  const allPossibleAnchors = [
    ...pools.dates,
    ...pools.people,
    ...pools.places,
    ...pools.events,
    ...pools.inventions,
    ...pools.numbers,
    ...pools.works,
    ...pools.organizations,
  ].filter(Boolean);

  const normalize = (s: string) => s.toLowerCase().trim();

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

  for (let i = 0; i < 5; i++) {
    const chap = repaired[i];
    while (chap.anchors.length < 2) {
      const unused = allPossibleAnchors.find(a => !usedAnchors.has(normalize(a)));
      if (unused) {
        usedAnchors.add(normalize(unused));
        chap.anchors.push(unused);
      } else {
        const fallbackAnchor = `${knowledge.common.title} detail part ${i + 1} (${chap.anchors.length + 1})`;
        chap.anchors.push(fallbackAnchor);
        usedAnchors.add(normalize(fallbackAnchor));
      }
    }
  }

  return repaired;
}
