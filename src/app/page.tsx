"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import { trackSearch, trackTopicOpened } from "@/lib/gtag";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleSearch(customTopic?: string) {
    const targetTopic = (customTopic || topic).trim();
    if (!targetTopic) return;

    setLoading(true);
    trackSearch(targetTopic);
    trackTopicOpened(targetTopic);
    router.push(`/results?topic=${encodeURIComponent(targetTopic)}`);
  }

  const suggestions = [
    { name: "Space Race", description: "Cold War race to the stars", emoji: "🚀" },
    { name: "Roman Empire", description: "From Republic to Fall", emoji: "🏛️" },
    { name: "Renaissance Art", description: "Humanism and masterpieces", emoji: "🎨" },
    { name: "Quantum Computing", description: "Superposition and qubits", emoji: "💻" },
    { name: "Napoleon Bonaparte", description: "Rise and fall of an empire", emoji: "⚔️" },
    { name: "Taj Mahal", description: "Monuments of eternal love", emoji: "🕌" },
  ];

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

        <h1 className="mt-8 text-5xl font-extrabold tracking-tight sm:text-7xl md:text-8xl">
          <span className="bg-gradient-to-b from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
            Wiki Visualizer
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg">
          Explore historical timelines, AI-synthesized editorial briefings, and interactive connected concepts maps for any Wikipedia subject.
        </p>

        {/* Search bar integration */}
        <div className="mt-12 w-full max-w-2xl">
          <SearchBar
            topic={topic}
            setTopic={setTopic}
            loading={loading}
            onAnalyze={() => handleSearch()}
          />
        </div>

        {/* Curated featured topics suggested list */}
        <div className="mt-16 w-full max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Or begin with a featured subject
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {suggestions.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSearch(item.name)}
                disabled={loading}
                className="group relative flex flex-col items-start rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-left transition-all duration-300 hover:border-cyan-400/30 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(0,245,160,0.05)] disabled:opacity-50"
              >
                <span className="text-2xl group-hover:scale-110 transition duration-300">
                  {item.emoji}
                </span>
                <h3 className="mt-3 font-semibold text-white group-hover:text-cyan-300 transition duration-300">
                  {item.name}
                </h3>
                <p className="mt-1 text-xs text-neutral-500 line-clamp-1">
                  {item.description}
                </p>
                <div className="absolute right-4 bottom-4 text-neutral-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-sm">
                  →
                </div>
              </button>
            ))}
          </div>
        </div>
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