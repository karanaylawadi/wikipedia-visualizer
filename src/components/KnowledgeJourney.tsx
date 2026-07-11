"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

type Milestone = {
  year: string;
  headline: string;
  description: string;
  importance: number;
  connections: string[];
  image?: string | null;
};

type Props = {
  category: string;
  timeline: Milestone[] | null;
};

export default function KnowledgeJourney({
  category,
  timeline
}: Props) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  // V19 correction: the timeline renders ONLY genuine timeline events from
  // the canonical artifact. The previous fallback that synthesized
  // "Phase N — Timeline progression of X" entries from related topics is
  // deleted outright — it was invented filler of exactly the kind
  // NON_NEGOTIABLES.md bans. With no valid events, this component renders
  // nothing (the page-level gate in results/page.tsx already prevents
  // mounting it at all).
  const parsedTimeline = useMemo(() => timeline || [], [timeline]);

  const headerDetails = useMemo(() => {
    const cat = category.toLowerCase();
    if (cat.includes("history") || cat.includes("war") || cat.includes("empire") || cat.includes("event")) {
      return { title: "Historical Chronology", subtitle: "Geopolitical milestones & historic eras" };
    }
    if (cat.includes("movie") || cat.includes("tv series") || cat.includes("book") || cat.includes("creative")) {
      return { title: "Production Chronology", subtitle: "Development history, releases, and reviews" };
    }
    if (cat.includes("person") || cat.includes("artist") || cat.includes("biography")) {
      return { title: "Life Chronology", subtitle: "Personal lifespans, contributions, and key milestones" };
    }
    if (cat.includes("company") || cat.includes("brand") || cat.includes("corporation")) {
      return { title: "Company Chronology", subtitle: "Founding, expansions, and structural achievements" };
    }
    if (cat.includes("tech") || cat.includes("programming")) {
      return { title: "Version Chronology", subtitle: "Architectural iterations & release progression" };
    }
    return { title: "Chronological Milestones", subtitle: "Milestones and chronological timeline points" };
  }, [category]);

  if (parsedTimeline.length === 0) return null;

  return (
    <section className="py-16 md:py-24 border-b border-white/5 animate-fade-in-up">
      {/* Editorial Header */}
      <div className="flex flex-col gap-2 mb-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400 font-mono">
          {headerDetails.subtitle}
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
          {headerDetails.title}
        </h2>
      </div>

      {/* Horizontal card-row timeline at every breakpoint, with a
          connecting line — unifies what was previously a desktop
          vertical-list-plus-panel layout and a separate mobile
          horizontal-scroll layout into one implementation. */}
      <div className="relative">
        <div className="absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent sm:block" />

        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-none snap-x snap-mandatory">
          {parsedTimeline.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`snap-start shrink-0 w-72 sm:w-80 cursor-pointer rounded-2xl border p-6 transition-all duration-300 ${
                  isActive
                    ? "bg-[#0b0b0f] border-cyan-400/30 shadow-[0_4px_30px_rgba(6,182,212,0.15)]"
                    : "bg-[#07080c]/60 border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-lg font-bold font-mono tracking-wider ${isActive ? "text-cyan-400" : "text-neutral-500"}`}>
                    {item.year}
                  </span>
                  <span className="text-[9px] font-mono bg-cyan-400/5 px-2 py-0.5 rounded text-cyan-400">
                    Imp: {item.importance}
                  </span>
                </div>

                <h4 className="text-base font-semibold text-white mb-2 leading-snug">
                  {item.headline}
                </h4>

                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                  {item.description}
                </p>

                {isActive && item.connections && item.connections.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                    {item.connections.slice(0, 3).map((conn, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/results?topic=${encodeURIComponent(conn)}`);
                        }}
                        className="text-[10px] text-cyan-400 hover:text-white bg-white/[0.02] border border-white/5 hover:border-cyan-400/30 px-2.5 py-1 rounded-full flex items-center gap-1 transition-all duration-300"
                      >
                        <span>{conn}</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Position indicators */}
        <div className="flex justify-center gap-1.5 mt-4">
          {parsedTimeline.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to timeline entry ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex ? "w-6 bg-cyan-400" : "w-1.5 bg-neutral-800"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
