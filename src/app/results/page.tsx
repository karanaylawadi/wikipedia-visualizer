"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import EditorialCarousel from "@/components/EditorialCarousel";
import PerspectiveGrid from "@/components/PerspectiveGrid";
import type { PerspectiveCard } from "@/components/PerspectiveGrid";
import { trackTopicOpened } from "@/lib/gtag";

// Lazy-loaded components for optimal performance & high Core Web Vitals (LCP/INP)
const VisualSnapshot = dynamic(() => import("@/components/VisualSnapshot"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-3xl bg-[#07080c] border border-white/5 animate-pulse flex items-center justify-center">
      <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">Loading Visual Snapshot...</span>
    </div>
  )
});

const FactCards = dynamic(() => import("@/components/FactCards"), {
  ssr: false,
  loading: () => (
    <div className="h-44 w-full rounded-3xl bg-[#07080c] border border-white/5 animate-pulse flex items-center justify-center">
      <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">Loading Insights...</span>
    </div>
  )
});

const KnowledgeJourney = dynamic(() => import("@/components/KnowledgeJourney"), {
  ssr: false,
  loading: () => (
    <div className="h-20 w-full rounded-full bg-[#07080c] border border-white/5 animate-pulse flex items-center justify-center">
      <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">Loading Journey Path...</span>
    </div>
  )
});

const DiscoveryCarousel = dynamic(() => import("@/components/DiscoveryCarousel"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-3xl bg-[#07080c] border border-white/5 animate-pulse flex items-center justify-center">
      <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">Loading Discovery Hub...</span>
    </div>
  )
});

interface TimelineMilestone {
  year: string;
  event: string;
}

interface BreadcrumbItem {
  label: string;
  url: string;
}

interface ExploreTopic {
  title: string;
  description: string;
  thumbnail: string | null;
  category: string;
}

interface StructuredFacts {
  title: string;
  subtitle: string;
  leadParagraph: string;
  categories: string[];
  majorSections: string[];
  relatedArticles: string[];
  importantDates: string[];
  extractSummary: string;
  statistics: string[];
  keyPeople: string[];
  locations: string[];
  organizations: string[];
}

interface AnalysisResponse {
  article: {
    title: string;
    description?: string;
    extract: string;
    thumbnail?: string | null;
    url?: string;
  };
  topicCategory: string;
  topicSubcategory: string;
  shortSummary: string;
  resultCards: PerspectiveCard[];
  didYouKnow: string[];
  exploredTopics: ExploreTopic[];
  timeline: TimelineMilestone[] | null;
  seo: {
    metaTitle: string;
    metaDescription: string;
    openGraphTitle: string;
    openGraphDescription: string;
    canonicalUrl: string;
    breadcrumbs: BreadcrumbItem[];
    jsonLdSchema: Record<string, unknown>;
  };
  structuredFacts: StructuredFacts;
  relatedList: string[];
  generatedAt: string;
  cacheVersion: string;
  cacheStatus?: string;
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic") || "";

  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const decodedTopic = useMemo(() => decodeURIComponent(topic), [topic]);

  useEffect(() => {
    async function loadTopic() {
      if (!decodedTopic) {
        setLoading(false);
        setError("No topic selected.");
        return;
      }

      setLoading(true);
      setError("");
      setData(null);

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: decodedTopic }),
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || "Unable to analyze this topic.");
        }

        setData(json);
        trackTopicOpened(decodedTopic);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    void loadTopic();
  }, [decodedTopic]);

  // Dynamically update SEO tags on client side
  useEffect(() => {
    if (!data?.seo) return;
    const seo = data.seo;
    document.title = seo.metaTitle;

    const updateMeta = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector);
      if (!meta) {
        meta = document.createElement("meta");
        if (isProperty) {
          meta.setAttribute("property", name);
        } else {
          meta.setAttribute("name", name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    updateMeta("description", seo.metaDescription);
    updateMeta("og:title", seo.openGraphTitle, true);
    updateMeta("og:description", seo.openGraphDescription, true);

    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", seo.canonicalUrl);
  }, [data]);

  const humanReadableCategory = (cat: string) => {
    if (!cat) return "";
    return cat
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <main className="relative min-h-screen bg-[#090A0F] px-4 py-6 text-white sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      {/* Dynamic JSON-LD SEO Schema injection */}
      {data?.seo?.jsonLdSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data.seo.jsonLdSchema) }}
        />
      )}

      {/* Background radial glows */}
      <div className="glow-cyan radial-glow absolute top-10 left-10 opacity-10 pointer-events-none" />
      <div className="glow-violet radial-glow absolute bottom-10 right-10 opacity-10 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Navigation header */}
        <nav className="flex items-center justify-between border-b border-white/5 pb-5 mb-5">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 transition hover:text-white"
          >
            ← Home
          </button>

          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Visualizer.wiki
          </span>

          <button
            onClick={() => router.back()}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 transition hover:text-white"
          >
            Back
          </button>
        </nav>

        {/* Dynamic SEO Breadcrumbs */}
        {data?.seo?.breadcrumbs && (
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-neutral-500 mb-6 font-mono">
            {data.seo.breadcrumbs.map((bc, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <span>/</span>}
                <button
                  onClick={() => router.push(bc.url)}
                  className="hover:text-white transition-colors duration-200"
                >
                  {bc.label}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <section className="flex min-h-[75vh] flex-col items-center justify-center text-center animate-fade-in-up">
            <div className="relative mb-8 flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin" />
              <div className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-md" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-cyan-400">
              Reading Wikipedia
            </p>
            <h1 className="mt-5 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
              Synthesizing Briefing
            </h1>
            <p className="mt-4 text-xs text-neutral-500 max-w-xs">
              Fetching details, dynamic perspectives, and connected concepts for {decodedTopic}...
            </p>
          </section>
        )}

        {/* Error State */}
        {error && !loading && (
          <section className="flex min-h-[75vh] flex-col items-center justify-center text-center animate-fade-in-up">
            <span className="text-3xl">⚠️</span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.4em] text-red-500">Error</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl text-white">Could not load topic</h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-500">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-8 rounded-full bg-white px-6 py-3 text-xs font-bold text-black transition hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              Try another search
            </button>
          </section>
        )}

        {/* Render Results Content */}
        {data && !loading && (
          <div className="animate-fade-in-up mt-8 space-y-4">
            <section className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">
                    {humanReadableCategory(data.topicCategory) || "Encyclopedia Profile"}
                  </span>
                  {data.cacheStatus && (
                    <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-600 bg-neutral-900 px-2 py-0.5 rounded border border-white/5 font-mono">
                      Cache: {data.cacheStatus}
                    </span>
                  )}
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent leading-none">
                  {data.article.title}
                </h1>
                <p className="text-base leading-relaxed text-neutral-400 font-light max-w-3xl">
                  {data.article.description || data.article.extract.split(".")[0] + "."}
                </p>
              </div>
            </section>

            {/* 1. REPLACE EDITORIAL BRIEF WITH CAROUSEL */}
            <EditorialCarousel
              cards={data.resultCards}
              importantDates={data.structuredFacts?.importantDates}
              statistics={data.structuredFacts?.statistics}
              category={data.topicCategory}
            />

            {/* 2. DYNAMIC VISUAL SNAPSHOT */}
            <VisualSnapshot
              category={data.topicCategory}
              facts={data.structuredFacts}
              timeline={data.timeline}
              thumbnail={data.article.thumbnail || null}
            />

            {/* 3. PERSPECTIVES GRID */}
            {data.resultCards && data.resultCards.length > 0 && (
              <PerspectiveGrid
                cards={data.resultCards}
                category={data.topicCategory}
              />
            )}

            {/* 4. SURPRISING INSIGHTS (FACT CARDS) */}
            {data.didYouKnow && data.didYouKnow.length > 0 && (
              <FactCards facts={data.didYouKnow} />
            )}

            {/* 5. KNOWLEDGE JOURNEY (HIERARCHICAL PATHWAY) */}
            {data.relatedList && data.relatedList.length > 0 && (
              <KnowledgeJourney
                currentTopic={data.article.title}
                category={data.topicCategory}
                subcategory={data.topicSubcategory}
                relatedList={data.relatedList}
              />
            )}

            {/* 6. DISCOVERY CAROUSEL (PEOPLE ALSO EXPLORED) */}
            {data.exploredTopics && data.exploredTopics.length > 0 && (
              <DiscoveryCarousel topics={data.exploredTopics} />
            )}

            {/* Editorial Footer */}
            <footer className="border-t border-white/5 py-12 text-center mt-12">
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-xs text-neutral-600">
                <p className="font-semibold tracking-[0.3em] text-neutral-400 uppercase">
                  Visualizer.wiki
                </p>
                <p>Synthesized dynamically from English Wikipedia articles</p>
                <p>AI briefs use Wikipedia-only source records</p>
              </div>

              {data.article.url && (
                <a
                  href={data.article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white px-5 py-2.5 text-xs font-bold text-black transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                >
                  Read original Wikipedia Article
                </a>
              )}
            </footer>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback = {
        <main className="flex min-h-screen items-center justify-center bg-[#090A0F] px-6 text-white">
          <div className="text-center">
            <div className="relative mx-auto mb-6 flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-t border-cyan-400 animate-spin" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Preparing Visualizer Session...</p>
          </div>
        </main>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}