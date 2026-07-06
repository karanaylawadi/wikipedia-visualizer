import { NextResponse } from "next/server";
import { searchWikipedia, getArticleIntelligence, getRelatedArticles } from "@/lib/editorial/wikipedia";
import { createCacheKey, getCachedAnalysis, setCachedAnalysis } from "@/lib/editorial/cache";
import { extractStructuredFacts } from "@/lib/editorial/facts";
import { classifyTopic } from "@/lib/editorial/classifier";
import { extractTimeline } from "@/lib/editorial/timeline";
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

function getFallbackCards(title: string, extract: string): PerspectiveCard[] {
  const defaultPerspectives = [
    { title: "Origins Outline", referenceLabel: "Origins", readerQuestion: `How did ${title} start?`, summary: `${title} originated through a series of key milestones. The early phase established the foundation for its subsequent growth, mapping out initial paths that would direct later historical milestones.`, keyTakeaway: "Pivotal startup moments." },
    { title: "Key Dynamics", referenceLabel: "Dynamics", readerQuestion: `What drives ${title}?`, summary: `${title} is driven by a core network of actions. These mechanisms interact continuously, shaping the structural limits of the system and guiding its operational progression.`, keyTakeaway: "Core structural drivers." },
    { title: "Evolution Path", referenceLabel: "Evolution", readerQuestion: `How did ${title} evolve?`, summary: `Through extensive developmental phases, ${title} adapted to major contextual changes. This trajectory reveals transitions that restructured its focus and expanded its final domain.`, keyTakeaway: "Pathways of progression." },
    { title: "Global Significance", referenceLabel: "Significance", readerQuestion: `Why does ${title} matter?`, summary: `The influence of ${title} extends across multiple fields. It is a critical benchmark for evaluating connected events and resolving theoretical debates in contemporary study.`, keyTakeaway: "Measuring global reach." },
    { title: "Enduring Legacy", referenceLabel: "Legacy", readerQuestion: `What is ${title}'s impact?`, summary: `The legacy of ${title} remains apparent today. It has left structural marks that persist in current practices, serving as a lasting foundation for new explorations.`, keyTakeaway: "Legacy that endures today." }
  ];

  const paragraphs = extract.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return defaultPerspectives.map((card, i) => {
    const text = paragraphs[i] || paragraphs[0] || card.summary;
    const words = text.split(/\s+/).filter(Boolean);
    const summary = words.length >= 80 && words.length <= 120 ? text : card.summary;
    return { ...card, summary };
  });
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

    // Stage 1: Structured Fact Extraction
    const structuredFacts = extractStructuredFacts(articleSource, related);

    // Stage 2: Category Classification
    const classification = await classifyTopic(topicKey, structuredFacts);

    // Stage 12: Timeline Extraction
    const timeline = await extractTimeline(topicKey, structuredFacts, classification);

    // Stage 3: Editorial Planning
    const plan = await createEditorialPlan(topicKey, structuredFacts, classification);
    const plannedCards = Array.isArray(plan?.cards) && plan.cards.length === 5 ? plan.cards : null;

    // Stage 5: Editorial Summary (With validation retry loop)
    const shortSummary = await retrySummary(topicKey, structuredFacts, classification);

    // Stage 4: Independent Card Generation (With validation retry loop)
    const resultCards: PerspectiveCard[] = [];
    if (plannedCards) {
      for (let i = 0; i < 5; i++) {
        const factsAlreadyUsed = resultCards.map((c) => c.summary).join("\n");
        const card = await retryCard(
          topicKey,
          i,
          plannedCards[i],
          structuredFacts,
          factsAlreadyUsed,
          resultCards
        );
        resultCards.push(card);
      }
    } else {
      const fallbacks = getFallbackCards(structuredFacts.title, structuredFacts.extractSummary);
      for (let i = 0; i < 5; i++) {
        resultCards.push(fallbacks[i]);
      }
    }

    // Stage 6: Surprising Facts Curation (With validation retry loop)
    const didYouKnow = await retryDidYouKnow(topicKey, structuredFacts);

    // Stage 11: People Also Explored Ranking (Custom code Jaccard match scorer)
    const explored = await curateRelatedExploration(topicKey, structuredFacts, classification);

    // Stage 15: SEO Metadata Builder
    const seo = buildStage15SEO(articleSource.title, shortSummary, classification.category);

    const responseData = {
      article: {
        title: articleSource.title,
        description: articleSource.description || "",
        extract: articleSource.extract,
        thumbnail: articleSource.thumbnail?.source ?? null,
        url: articleSource.content_urls?.desktop?.page ?? null,
      },
      topicCategory: classification.category,
      topicSubcategory: classification.subcategory,
      shortSummary,
      resultCards,
      didYouKnow,
      exploredTopics: explored,
      timeline,
      seo,
      structuredFacts,
      relatedList: structuredFacts.relatedArticles,
      generatedAt: new Date().toISOString(),
      cacheVersion: "results-v11-editorial-engine",
    };

    await setCachedAnalysis(topicKey, responseData);

    return NextResponse.json({
      ...responseData,
      cacheStatus: "miss",
    });
  } catch (error) {
    console.error("Analyze route V11 failed:", error);
    return NextResponse.json({ error: "The analysis request failed." }, { status: 500 });
  }
}
