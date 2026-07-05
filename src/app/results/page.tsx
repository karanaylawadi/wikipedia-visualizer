
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AISummary from "@/components/AISummary";
import HeroImage from "@/components/HeroImage";
import Timeline, { TimelineItem } from "@/components/Timeline";
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
        trackTopicOpened(decodedTopic);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    void loadTopic();
  }, [decodedTopic]);

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between border-b border-white/10 pb-6">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-neutral-400 transition hover:text-white"
          >
            ← Home
          </button>

          <button
            onClick={() => router.back()}
            className="text-sm text-neutral-400 transition hover:text-white"
          >
            Back
          </button>
        </nav>

        {loading && (
          <section className="flex min-h-[70vh] flex-col items-center justify-center text-center animate-[fadeIn_0.5s_ease-out]">
            <div className="mb-8 h-16 w-16 rounded-full p-[2px] animated-gradient">
              <div className="h-full w-full rounded-full bg-black" />
            </div>
            <p className="text-xs uppercase tracking-[0.45em] text-cyan-300">
              Reading Wikipedia
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-7xl">
              Building your visual briefing
            </h1>
          </section>
        )}

        {error && !loading && (
          <section className="flex min-h-[70vh] flex-col items-center justify-center text-center animate-[fadeIn_0.5s_ease-out]">
            <p className="text-xs uppercase tracking-[0.45em] text-red-400">Error</p>
            <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Could not load topic.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-400">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-8 rounded-full border border-white/20 px-6 py-3 font-semibold transition hover:bg-white hover:text-black"
            >
              Try another search
            </button>
          </section>
        )}

        {data && !loading && (
          <div className="animate-[fadeIn_0.6s_ease-out]">
            <section className="grid gap-8 border-b border-white/10 py-10 sm:gap-10 sm:py-12 md:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-white/10 bg-neutral-950/80 p-7 sm:p-8 lg:p-10">
                  <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
                    Wikipedia briefing
                  </p>
                  <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
                    {data.article.title}
                  </h1>
                  <p className="mt-5 text-lg leading-8 text-neutral-400">
                    {data.analysis.description}
                  </p>
                </div>

                <AISummary
                  title={data.analysis.title}
                  description={data.analysis.description}
                  briefing={data.analysis.editorialBrief || data.analysis.briefing}
                />
              </div>

              <HeroImage title={data.article.title} imageUrl={data.article.thumbnail ?? null} />
            </section>

            {selectedEvent && (
              <section className="my-8 rounded-[2rem] border border-cyan-400/25 bg-neutral-950/80 p-6 sm:my-10 sm:p-8 lg:p-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
                      Focus card
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold text-white">
                      {selectedEvent.title}
                    </h2>
                    <p className="mt-2 text-base text-neutral-500">{selectedEvent.year}</p>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-sm text-neutral-500 transition hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">What happened</p>
                      <p className="mt-3 text-lg leading-8 text-neutral-200">
                        {selectedEvent.whatHappened || selectedEvent.summary}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Why it mattered</p>
                      <p className="mt-3 text-lg leading-8 text-neutral-300">
                        {selectedEvent.whyItMattered || selectedEvent.significance || "This milestone marks a turning point in the subject's historical development."}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-black/40 p-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Long-term impact</p>
                      <p className="mt-3 text-lg leading-8 text-neutral-300">
                        {selectedEvent.longTermImpact || "Its consequences continued to shape the subject's historical context over time."}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Related people</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(selectedEvent.relatedPeople?.length ? selectedEvent.relatedPeople : ["Notable figures"]).map((person) => (
                          <span key={person} className="rounded-full border border-white/10 px-3 py-1 text-sm text-neutral-300">
                            {person}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Related places</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(selectedEvent.relatedPlaces?.length ? selectedEvent.relatedPlaces : ["Key locations"]).map((place) => (
                          <span key={place} className="rounded-full border border-white/10 px-3 py-1 text-sm text-neutral-300">
                            {place}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {data.analysis.timeline?.length > 0 && (
              <Timeline
                items={data.analysis.timeline}
                onSelect={(item) => {
                  setSelectedEvent(item);
                  trackTimelineCardClicked(item.title);
                }}
              />
            )}

            {data.analysis.relatedArticles?.length ? (
              <section className="border-t border-white/10 py-10 sm:py-12 md:py-16">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
                  Related Topics
                </p>
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {data.analysis.relatedArticles.map((article) => (
                    <button
                      key={article.title}
                      type="button"
                      onClick={() => trackRelatedTopicClicked(article.title)}
                      className="rounded-[1.5rem] border border-white/10 bg-neutral-950/80 p-6 text-left transition hover:border-cyan-400/50 hover:bg-neutral-900"
                    >
                      <h3 className="text-xl font-semibold text-white">{article.title}</h3>
                      {article.description && (
                        <p className="mt-3 text-sm leading-7 text-neutral-400">{article.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <footer className="border-t border-white/10 py-10 text-center sm:py-12">
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-sm leading-7 text-neutral-500">
                <p className="font-semibold tracking-[0.3em] text-neutral-300 uppercase">Visualizer.wiki</p>
                <p>Powered by Wikipedia</p>
                <p>AI summaries use Wikipedia-only content</p>
                <p>Built with Next.js</p>
              </div>

              {data.article.url && (
                <a
                  href={data.article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 inline-flex items-center rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-black"
                >
                  Read on Wikipedia
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
        <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
          <p className="text-lg text-neutral-400">Preparing your story…</p>
        </main>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}