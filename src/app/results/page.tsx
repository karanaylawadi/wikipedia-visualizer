"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AISummary from "@/components/AISummary";
import PerspectivesGrid, { PerspectiveCard } from "@/components/PerspectivesGrid";
import { trackRelatedTopicClicked, trackTopicOpened } from "@/lib/gtag";

type AnalysisResponse = {
  article: {
    title: string;
    description?: string;
    extract: string;
    thumbnail?: string | null;
    url?: string;
  };
  topicCategory: string;
  shortSummary: string;
  resultCards: PerspectiveCard[];
  didYouKnow: string[];
  relatedTopics: Array<{
    title: string;
    description?: string;
  }>;
  generatedAt: string;
  cacheVersion: string;
  cacheStatus?: string;
};

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

  const humanReadableCategory = (cat: string) => {
    if (!cat) return "";
    return cat
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <main className="relative min-h-screen bg-[#030303] px-4 py-6 text-white sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      {/* Background radial glows */}
      <div className="glow-cyan radial-glow absolute top-10 left-10 opacity-10" />
      <div className="glow-violet radial-glow absolute bottom-10 right-10 opacity-10" />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Navigation header */}
        <nav className="flex items-center justify-between border-b border-white/5 pb-5">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 transition hover:text-white"
          >
            ← Home
          </button>

          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-600">
            Visualizer.wiki
          </span>

          <button
            onClick={() => router.back()}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 transition hover:text-white"
          >
            Back
          </button>
        </nav>

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
          <div className="animate-fade-in-up mt-8 space-y-10">
            
            {/* 1. Header Profile & AI Summary */}
            <section className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">
                    {humanReadableCategory(data.topicCategory) || "Encyclopedia Profile"}
                  </span>
                  {data.cacheStatus && (
                    <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-600 bg-neutral-900 px-2 py-0.5 rounded border border-white/5">
                      Cache: {data.cacheStatus}
                    </span>
                  )}
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
                  {data.article.title}
                </h1>
                <p className="text-base leading-relaxed text-neutral-400 font-light">
                  {data.article.description || data.article.extract.split(".")[0] + "."}
                </p>
              </div>

              <AISummary
                title={data.article.title}
                description={data.article.description || ""}
                briefing={data.shortSummary}
              />
            </section>

            <hr className="border-white/5" />

            {/* 2. Analysis Perspectives (CSS Grid cards) */}
            {data.resultCards?.length > 0 && (
              <section>
                <PerspectivesGrid
                  cards={data.resultCards}
                  category={data.topicCategory}
                />
              </section>
            )}

            <hr className="border-white/5" />

            {/* 3. Did You Know Section (Premium bulleted list) */}
            {data.didYouKnow?.length > 0 && (
              <section className="py-6 animate-fade-in-up">
                <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-400 mb-6">
                  Did You Know?
                </h2>
                <ul className="space-y-4 max-w-3xl">
                  {data.didYouKnow.map((fact, index) => (
                    <li key={index} className="flex gap-4 items-start text-sm leading-relaxed text-neutral-300 font-light">
                      <span className="text-cyan-400 select-none">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <hr className="border-white/5" />

            {/* 4. Related Readings/Topics Cards */}
            {data.relatedTopics?.length ? (
              <section className="py-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">
                  Related Readings
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  Explore Further
                </h2>
                <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {data.relatedTopics.map((topic) => (
                    <button
                      key={topic.title}
                      type="button"
                      onClick={() => {
                        trackRelatedTopicClicked(topic.title);
                        router.push(`/results?topic=${encodeURIComponent(topic.title)}`);
                      }}
                      className="group relative flex flex-col justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-left transition-all duration-300 hover:border-cyan-400/30 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(0,245,160,0.05)]"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition duration-300">
                          {topic.title}
                        </h3>
                        {topic.description && (
                          <p className="mt-2.5 text-xs text-neutral-500 line-clamp-2 capitalize">
                            {topic.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-6 flex items-center justify-between text-xs text-neutral-500">
                        <span>Read Briefing</span>
                        <span className="group-hover:translate-x-1 transition duration-300 text-cyan-400 font-bold">
                          →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {/* 5. Editorial Footer */}
            <footer className="border-t border-white/5 py-12 text-center">
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
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#030303] px-6 text-white">
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