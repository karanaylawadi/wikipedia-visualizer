"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Calendar, Compass, Sparkles } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { trackSearch, trackTopicOpened } from "@/lib/gtag";

const FEATURE_INDICATORS = [
  { icon: BookOpen, label: "AI Editorial Summary" },
  { icon: Calendar, label: "Interactive Timeline" },
  { icon: Compass, label: "Connected Topics" },
  { icon: Sparkles, label: "2.4M Wikipedia Articles" },
];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [neighbors, setNeighbors] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("last-topic-neighbors");
      if (cached) {
        try {
          setNeighbors(JSON.parse(cached) as string[]);
        } catch (e) {
          console.warn("Failed to parse cached neighbors", e);
        }
      }
    }
  }, []);

  function handleSearch(customTopic?: string) {
    const targetTopic = (customTopic || topic).trim();
    if (!targetTopic) return;

    setLoading(true);
    trackSearch(targetTopic);
    trackTopicOpened(targetTopic);
    router.push(`/results?topic=${encodeURIComponent(targetTopic)}`);
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-[#030303] px-6 text-white selection:bg-cyan-500/30 selection:text-white">
      {/* Cinematic Glowing background blobs */}
      <div className="glow-cyan radial-glow absolute -top-40 -left-40 animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="glow-violet radial-glow absolute -bottom-40 -right-40 animate-[pulse_10s_ease-in-out_infinite]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#030303_90%)]" />

      {/* Decorative Grid backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />

      {/* Empty spacer for alignment */}
      <div className="h-10" />

      <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center justify-center text-center">
        {/* Brand Tagline */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-4 py-1.5 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-400">
            Interactive Encyclopedia
          </span>
        </div>

        <h1 className="mt-8 font-display text-5xl font-bold tracking-tight sm:text-7xl md:text-8xl">
          <span className="bg-gradient-to-b from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
            Wiki Visualizer
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg">
          Understand anything on Wikipedia through AI-generated editorial summaries, interactive timelines and connected knowledge.
        </p>

        {/* Search bar integration */}
        <div className="mt-12 w-full max-w-2xl">
          <SearchBar
            topic={topic}
            setTopic={setTopic}
            loading={loading}
            onAnalyze={() => handleSearch()}
            currentGraphNeighbors={neighbors}
          />
        </div>

        {/* Compact feature indicators */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {FEATURE_INDICATORS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-500"
            >
              <Icon className="h-3.5 w-3.5 text-cyan-400/70" />
              {label}
            </span>
          ))}
        </div>

        <Link
          href="/featured"
          className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 transition hover:text-cyan-400"
        >
          Browse Featured Articles →
        </Link>
      </section>

      {/* Footer Branding */}
      <footer className="relative z-10 py-10 text-center">
        <div className="flex flex-col items-center gap-2 text-xs text-neutral-600">
          <p className="font-semibold tracking-[0.2em] text-neutral-400 uppercase">
            Visualizer.wiki
          </p>
          <p>© {new Date().getFullYear()} · Powered by Wikipedia & Gemini AI</p>
        </div>
      </footer>
    </main>
  );
}