import { NextResponse } from "next/server";
import { searchWikipedia, getArticleIntelligence, getRelatedArticles } from "@/lib/editorial/wikipedia";
import { createCacheKey, getCachedAnalysis, setCachedAnalysis } from "@/lib/editorial/cache";
import { extractTopicKnowledge } from "@/lib/editorial/extractor";
import { assignFactsToChapters } from "@/lib/editorial/factAssignment";
import { createEditorialPlan } from "@/lib/editorial/planner";
import { curateRelatedExploration } from "@/lib/editorial/related";
import { retrySummary, retryCard, retryDidYouKnow } from "@/lib/editorial/retry";
import type { PerspectiveCard } from "@/lib/editorial/perspectives";

interface BreadcrumbItem {
  label: string;
  url: string;
}

interface SEOMetadata {
  metaTitle: string;
  metaDescription: string;
  openGraphTitle: string;
  openGraphDescription: string;
  canonicalUrl: string;
  breadcrumbs: BreadcrumbItem[];
  jsonLdSchema: Record<string, unknown>;
}

function buildStage15SEO(topic: string, shortSummary: string, category: string): SEOMetadata {
  const metaTitle = `${topic} — Premium Editorial Briefing | Visualizer.wiki`;
  const metaDescription = shortSummary.slice(0, 155) + "...";
  const openGraphTitle = `${topic} Explained in 5 Minutes`;
  const openGraphDescription = `Read the Visualizer.wiki briefing on ${topic}. Discover key insights, timelines, and facts.`;
  const canonicalUrl = `https://visualizer.wiki/results?topic=${encodeURIComponent(topic)}`;

  const breadcrumbs = [
    { label: "Home", url: "/" },
    { label: category || "Topic", url: `/results?category=${encodeURIComponent(category || "Topic")}` },
    { label: topic, url: canonicalUrl }
  ];

  const jsonLdSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": metaTitle,
    "description": metaDescription,
    "url": canonicalUrl,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "publisher": {
      "@type": "Organization",
      "name": "Visualizer.wiki",
      "logo": {
        "@type": "ImageObject",
        "url": "https://visualizer.wiki/icon.png"
      }
    }
  };

  return {
    metaTitle,
    metaDescription,
    openGraphTitle,
    openGraphDescription,
    canonicalUrl,
    breadcrumbs,
    jsonLdSchema
  };
}

function getFallbackCards(title: string): PerspectiveCard[] {
  return [
    { 
      title: "Foundational Spark", 
      referenceLabel: "Foundations", 
      readerQuestion: "What started this?", 
      summary: `Long before ${title} achieved widespread recognition, a series of crucial but overlooked events set its path in motion. The initial stages were defined by key thinkers and quiet breakthroughs that established the core parameters of the entire field. By examining these early steps, we begin to see how localized developments laid the essential groundwork for the massive structural shifts that would redefine society shortly thereafter.`, 
      keyTakeaway: "Pivotal initial sparks." 
    },
    { 
      title: "Catalyst for Change", 
      referenceLabel: "Turning Point", 
      readerQuestion: "What changed everything?", 
      summary: `The trajectory of ${title} shifted dramatically when a single monumental breakthrough redefined what was possible. Rather than an incremental change, this development acted as a major catalyst that disrupted existing frameworks and established an entirely new set of paradigms. In a matter of years, old conventions collapsed, forcing competitors and researchers to adapt to a rapidly evolving landscape.`, 
      keyTakeaway: "A major paradigm shift." 
    },
    { 
      title: "Architects of Progress", 
      referenceLabel: "Key Players", 
      readerQuestion: "Who were the key people?", 
      summary: `Behind the monumental rise of ${title} stood a group of highly determined individuals whose visions shaped its direction. These key figures operated in a high-stakes environment, making critical decisions that would echo for generations. Their personal philosophies, internal rivalries, and unique designs left a lasting mark on the project, proving that the human element remains the most significant force in complex historical movements.`, 
      keyTakeaway: "Human choices drive history." 
    },
    { 
      title: "Unforeseen Horizons", 
      referenceLabel: "Consequences", 
      readerQuestion: "What happened next?", 
      summary: `Following those central turning points, ${title} entered a prolonged phase of rapid expansion and unforeseen complications. The newly established systems spread quickly across diverse industries and regions, sparking intense debates and structural shifts in neighboring fields. As the boundaries of the original vision were pushed, designers had to confront the direct consequences of their creations, balancing progress and stability.`, 
      keyTakeaway: "Navigating expansion." 
    },
    { 
      title: "Enduring Echoes", 
      referenceLabel: "Modern Legacy", 
      readerQuestion: "Why does it still matter?", 
      summary: `Decades later, the legacy of ${title} continues to shape our modern world in deep and unexpected ways. The systems and ideas forged in its early days remain embedded in our daily lives, serving as the quiet infrastructure of contemporary culture. To understand the challenges of the present, we must trace them back to the decisions made during this pivotal era.`, 
      keyTakeaway: "The past shapes the present." 
    }
  ];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { topic?: string };
    const topic = body.topic?.trim();

    if (!topic) {
      return NextResponse.json({ error: "A topic is required." }, { status: 400 });
    }

    const topicKey = createCacheKey(topic);
    const cachedData = await getCachedAnalysis(topicKey);
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cacheStatus: "hit",
      });
    }

    // Fetch raw Wikipedia data
    const article = await searchWikipedia(topic);
    if (!article) {
      return NextResponse.json({ error: "No article was found for that topic." }, { status: 404 });
    }

    const intelligence = await getArticleIntelligence(topic);
    const articleSource = intelligence || article;
    const related = await getRelatedArticles(topic);

    // Step 2: Extract structured knowledge TopicKnowledge
    const knowledge = await extractTopicKnowledge(topicKey, articleSource, related);

    // Step 3: Editorial Planning from TopicKnowledge
    const plan = await createEditorialPlan(topicKey, knowledge);
    const plannedCards = Array.isArray(plan?.cards) && plan.cards.length === 5 ? plan.cards : null;

    // Step 5: Assign unique facts to each chapter before writing
    const assignedFacts = await assignFactsToChapters(topicKey, knowledge, plan);

    // Step 4: Editorial Summary from TopicKnowledge
    const shortSummary = await retrySummary(topicKey, knowledge);

    // Step 4/6: Independent Card Generation from TopicKnowledge and assigned facts
    const resultCards: PerspectiveCard[] = [];
    if (plannedCards) {
      for (let i = 0; i < 5; i++) {
        const factsAlreadyUsed = resultCards.map((c) => c.summary).join("\n");
        const card = await retryCard(
          topicKey,
          i,
          plannedCards[i],
          knowledge,
          assignedFacts[i],
          factsAlreadyUsed,
          resultCards
        );
        resultCards.push(card);
      }
    } else {
      const fallbacks = getFallbackCards(knowledge.common.title);
      for (let i = 0; i < 5; i++) {
        resultCards.push(fallbacks[i]);
      }
    }

    // Step 6: Surprising Facts Curation from TopicKnowledge
    const didYouKnow = await retryDidYouKnow(topicKey, knowledge);

    // Map structuredFacts and classification for curateRelatedExploration to remain fully backwards compatible
    const mappedStructuredFacts = {
      title: knowledge.common.title,
      subtitle: knowledge.common.description,
      leadParagraph: knowledge.common.description,
      categories: [knowledge.common.category],
      majorSections: knowledge.common.sourceSections.map((s) => s.title),
      relatedArticles: knowledge.common.relatedTopics,
      importantDates: knowledge.common.timeline.map((t) => `${t.year}: ${t.event}`),
      extractSummary: knowledge.common.summaryFacts.join("\n"),
      statistics: (knowledge.common.summaryFacts || []).filter((s) => /\d/.test(s)),
      keyPeople: knowledge.personData?.occupation ? [knowledge.common.title] : (knowledge.historyData?.importantPeople || knowledge.movieData?.cast || []),
      locations: knowledge.historyData?.geography || knowledge.countryData?.bordering || [],
      organizations: knowledge.companyData?.founder ? [knowledge.common.title] : (knowledge.organizationData?.members || []),
      
      // Inject ontology metadata for visual snapshot rendering
      entityType: knowledge.entityType,
      ontologyLabels: knowledge.ontologyLabels,
      movieData: knowledge.movieData,
      personData: knowledge.personData,
      technologyData: knowledge.technologyData,
      countryData: knowledge.countryData,
      companyData: knowledge.companyData,
      bookData: knowledge.bookData,
      scienceData: knowledge.scienceData,
      organizationData: knowledge.organizationData,
      historyData: knowledge.historyData,
    };

    // Step 11: People Also Explored Ranking
    const explored = await curateRelatedExploration(topicKey, knowledge);

    // Step 15: SEO Metadata Builder
    const seo = buildStage15SEO(knowledge.common.title, shortSummary, knowledge.common.category);

    const responseData = {
      article: {
        title: knowledge.common.title,
        description: knowledge.common.description,
        extract: articleSource.extract,
        thumbnail: articleSource.thumbnail?.source ?? null,
        url: articleSource.content_urls?.desktop?.page ?? null,
      },
      topicCategory: knowledge.common.category,
      topicSubcategory: "General",
      ontologyLabels: knowledge.ontologyLabels,
      entityType: knowledge.entityType,
      shortSummary,
      resultCards,
      didYouKnow,
      exploredTopics: explored,
      timeline: knowledge.common.timeline,
      seo,
      structuredFacts: mappedStructuredFacts,
      relatedList: knowledge.common.relatedTopics,
      generatedAt: new Date().toISOString(),
      cacheVersion: "results-v14-ontology-engine",
    };

    await setCachedAnalysis(topicKey, responseData);

    return NextResponse.json({
      ...responseData,
      cacheStatus: "miss",
    });
  } catch (error) {
    console.error("Analyze route V14 failed:", error);
    return NextResponse.json({ error: "The analysis request failed." }, { status: 500 });
  }
}
