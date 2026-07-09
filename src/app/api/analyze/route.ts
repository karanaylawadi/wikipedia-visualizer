import { NextResponse } from "next/server";
import { getArticleIntelligence, searchWikipedia, ArticleIntelligence } from "@/lib/editorial/wikipedia";
import { createCacheKey, getCachedAnalysis, setCachedAnalysis } from "@/lib/editorial/cache";
import { processKnowledgeDAG } from "@/lib/knowledge/dag";
import { curateRelatedExploration } from "@/lib/editorial/related";
import { mapEntityTypeToOntology } from "@/lib/ontology/ontologyEngine";
import type { PerspectiveCard } from "@/lib/knowledge/geminiWriter";

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

    // 1. Fetch raw Wikipedia data
    let articleSource = await getArticleIntelligence(topic);
    if (!articleSource) {
      const searchResult = await searchWikipedia(topic);
      if (!searchResult) {
        return NextResponse.json({ error: "No article was found for that topic." }, { status: 404 });
      }
      articleSource = {
        ...searchResult,
        lead: searchResult.extract.split(".")[0] + ".",
        sectionHeadings: [],
        wikitext: "",
        links: [],
        categories: []
      };
    }

    // 2. Compile and compile-check via Stage 7 DAG Pipeline
    const artifact = await processKnowledgeDAG(topic, articleSource);

    // 3. Process compatibility mapping for VisualSnapshot.tsx rendering
    const ontologyName = artifact.ontology.name;
    const mappedStructuredFacts: any = {
      title: artifact.structuredFacts.title,
      subtitle: artifact.structuredFacts.subtitle,
      leadParagraph: artifact.structuredFacts.leadParagraph,
      categories: artifact.ontology.labels,
      majorSections: artifact.sourceReferences.map(r => r.title),
      relatedArticles: artifact.relatedTopics,
      importantDates: artifact.timeline.map((t) => `${t.year}: ${t.event}`),
      extractSummary: artifact.structuredFacts.briefSummary,
      statistics: artifact.rankedFacts.filter((f) => /\d/.test(f.fact)).map((f) => f.fact),
      keyPeople: artifact.namedEntities.filter((e) => e.type === "Person").map((e) => e.name),
      locations: artifact.namedEntities.filter((e) => e.type === "Place").map((e) => e.name),
      organizations: artifact.namedEntities.filter((e) => e.type === "Org").map((e) => e.name),
      
      // Inject ontology metadata
      entityType: artifact.ontology.labels[0],
      ontologyLabels: artifact.ontology.labels
    };

    // Inject ontology specific block data
    if (ontologyName === "Movie") mappedStructuredFacts.movieData = artifact.structuredFacts;
    else if (ontologyName === "Person") mappedStructuredFacts.personData = artifact.structuredFacts;
    else if (ontologyName === "Technology") mappedStructuredFacts.technologyData = artifact.structuredFacts;
    else if (ontologyName === "Country") mappedStructuredFacts.countryData = artifact.structuredFacts;
    else if (ontologyName === "Company") mappedStructuredFacts.companyData = artifact.structuredFacts;
    else if (ontologyName === "Art Movement") mappedStructuredFacts.bookData = artifact.structuredFacts;
    else if (ontologyName === "Science") mappedStructuredFacts.scienceData = artifact.structuredFacts;
    else if (ontologyName === "Organization") mappedStructuredFacts.organizationData = artifact.structuredFacts;
    else if (ontologyName === "Historical Event") mappedStructuredFacts.historyData = artifact.structuredFacts;

    // 4. Related journeys mapping
    const topicKnowledgeCompat: any = {
      entityType: artifact.ontology.labels[0],
      ontologyLabels: artifact.ontology.labels,
      common: {
        title: artifact.structuredFacts.title,
        description: artifact.structuredFacts.subtitle,
        relatedTopics: artifact.relatedTopics
      }
    };
    const explored = await curateRelatedExploration(topicKey, topicKnowledgeCompat);

    // 5. SEO Metadata Builder
    const seo = buildStage15SEO(
      artifact.structuredFacts.title,
      artifact.structuredFacts.briefSummary,
      artifact.ontology.labels[0]
    );

    const responseData = {
      article: {
        title: artifact.structuredFacts.title,
        description: artifact.structuredFacts.subtitle,
        extract: articleSource.extract,
        thumbnail: articleSource.thumbnail?.source ?? null,
        url: articleSource.content_urls?.desktop?.page ?? null,
      },
      topicCategory: artifact.ontology.labels[0],
      topicSubcategory: "General",
      ontologyLabels: artifact.ontology.labels,
      entityType: artifact.ontology.labels[0],
      shortSummary: artifact.structuredFacts.briefSummary,
      resultCards: artifact.structuredFacts.cards || [],
      didYouKnow: artifact.triviaCandidates.slice(0, 5),
      exploredTopics: explored,
      timeline: artifact.timeline,
      seo,
      structuredFacts: mappedStructuredFacts,
      relatedList: artifact.relatedTopics,
      generatedAt: new Date().toISOString(),
      cacheVersion: "results-v15-knowledge-os",
    };

    // Cache the resolved API response payload in Redis
    await setCachedAnalysis(topicKey, responseData);

    return NextResponse.json({
      ...responseData,
      cacheStatus: "miss",
    });
  } catch (error) {
    console.error("Analyze route V15 failed:", error);
    return NextResponse.json({ error: "The analysis request failed." }, { status: 500 });
  }
}
