
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AISummary from "@/components/AISummary";
import HeroImage from "@/components/HeroImage";
import Timeline, { TimelineItem } from "@/components/Timeline";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import { trackRelatedTopicClicked, trackTimelineCardClicked, trackTopicOpened } from "@/lib/gtag";

type AnalysisResponse = {
  article: {
    title: string;
    description?: string;
    extract: string;
    thumbnail?: string | null;
    url?: string;
  };
  analysis: {
    title: string;
    description: string;
    briefing: string;
    editorialBrief?: string;
    timeline: TimelineItem[];
    relatedArticles?: Array<{
      title: string;
      description?: string;
      relevanceScore?: number;
      category?: string;
      connections?: string[];
      thumbnail?: { source: string };
    }>;
  };
};

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic") || "";

  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<TimelineItem | null>(null);

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
      setSelectedEvent(null);

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
        // Default select the first event to populate details pane
        if (json.analysis.timeline?.length > 0) {
          setSelectedEvent(json.analysis.timeline[0]);
        }
        trackTopicOpened(decodedTopic);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    void loadTopic();
  }, [decodedTopic]);

  // Active detail view event determines what details are shown
  const activeEvent = selectedEvent || (data?.analysis.timeline?.length ? data.analysis.timeline[0] : null);

  return (
    <main className="relative min-h-screen bg-[#030303] px-4 py-6 text-white sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      {/* Background radial glows */}
      <div className="glow-cyan radial-glow absolute top-10 left-10 opacity-10" />
      <div className="glow-violet radial-glow absolute bottom-10 right-10 opacity-10" />

      <div className="relative z-10 mx-auto max-w-6xl">
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
              Fetching details, timeline milestones, and connected concepts for {decodedTopic}...
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
          <div className="animate-fade-in-up mt-8 space-y-12">
            
            {/* 1. Briefing Header Section */}
            <section className="grid gap-6 sm:gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-white/5 bg-gradient-to-br from-neutral-900/30 to-neutral-950/50 p-7 backdrop-blur-xl sm:p-8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                    Subject Profile
                  </p>
                  <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
                    {data.article.title}
                  </h1>
                  <p className="mt-5 text-base leading-relaxed text-neutral-400">
                    {data.analysis.description}
                  </p>
                </div>

                <AISummary
                  title={data.analysis.title}
                  description={data.analysis.description}
                  briefing={data.analysis.editorialBrief || data.analysis.briefing}
                />
              </div>

              <div className="min-h-[320px] lg:min-h-full">
                <HeroImage title={data.article.title} imageUrl={data.article.thumbnail ?? null} />
              </div>
            </section>

            {/* 2. Knowledge Map Section */}
            {data.analysis.relatedArticles?.length ? (
              <KnowledgeGraph
                title={data.article.title}
                related={data.analysis.relatedArticles}
                onSelectNode={(nodeTitle) => {
                  trackRelatedTopicClicked(nodeTitle);
                  router.push(`/results?topic=${encodeURIComponent(nodeTitle)}`);
                }}
              />
            ) : null}

            {/* 3. Chronology Milestones Section (Two columns on desktop) */}
            {data.analysis.timeline?.length > 0 && (
              <section className="border-t border-white/5 py-12 md:py-16">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:items-start">
                  
                  {/* Left: Scrollable Timeline */}
                  <div>
                    <Timeline
                      items={data.analysis.timeline}
                      selectedItem={activeEvent}
                      onSelect={(item) => {
                        setSelectedEvent(item);
                        trackTimelineCardClicked(item.title);
                      }}
                    />
                  </div>

                  {/* Right: Sticky Details Card */}
                  <div className="lg:sticky lg:top-8 lg:mt-16">
                    {activeEvent && (
                      <div className="rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-neutral-900/35 via-[#0d0d12]/90 to-black p-6 shadow-xl backdrop-blur-xl sm:p-8">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">
                            Milestone Profile
                          </p>
                          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-cyan-300">
                            {activeEvent.year}
                          </span>
                        </div>

                        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                          {activeEvent.title}
                        </h3>

                        <hr className="my-5 border-white/5" />

                        <div className="space-y-5 text-sm leading-relaxed">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                              What Happened
                            </span>
                            <p className="mt-2 text-neutral-300">
                              {activeEvent.whatHappened || activeEvent.summary}
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                              Significance
                            </span>
                            <p className="mt-2 text-neutral-400">
                              {activeEvent.whyItMattered || activeEvent.significance || "Marks a defining point in the subject's development."}
                            </p>
                          </div>

                          {activeEvent.longTermImpact && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                                Long-term Impact
                              </span>
                              <p className="mt-2 text-neutral-400">
                                {activeEvent.longTermImpact}
                              </p>
                            </div>
                          )}

                          {activeEvent.relatedPeople && activeEvent.relatedPeople.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                                Related Figures
                              </span>
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {activeEvent.relatedPeople.map((person) => (
                                  <span
                                    key={person}
                                    className="rounded-full border border-white/5 bg-white/[0.02] px-2.5 py-1 text-xs text-neutral-400 hover:border-cyan-500/30 hover:text-white transition duration-300"
                                  >
                                    {person}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {activeEvent.relatedPlaces && activeEvent.relatedPlaces.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                                Key Locations
                              </span>
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {activeEvent.relatedPlaces.map((place) => (
                                  <span
                                    key={place}
                                    className="rounded-full border border-white/5 bg-white/[0.02] px-2.5 py-1 text-xs text-neutral-400 hover:border-cyan-500/30 hover:text-white transition duration-300"
                                  >
                                    {place}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </section>
            )}

            {/* 4. Related Readings/Topics Cards */}
            {data.analysis.relatedArticles?.length ? (
              <section className="border-t border-white/5 py-12 md:py-16">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">
                  Related Readings
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  Explore Further
                </h2>
                <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {data.analysis.relatedArticles.map((article) => (
                    <button
                      key={article.title}
                      type="button"
                      onClick={() => {
                        trackRelatedTopicClicked(article.title);
                        router.push(`/results?topic=${encodeURIComponent(article.title)}`);
                      }}
                      className="group relative flex flex-col justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-left transition-all duration-300 hover:border-cyan-400/30 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(0,245,160,0.05)]"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition duration-300">
                          {article.title}
                        </h3>
                        {article.description && (
                          <p className="mt-2.5 text-xs text-neutral-500 line-clamp-2 capitalize">
                            {article.description}
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