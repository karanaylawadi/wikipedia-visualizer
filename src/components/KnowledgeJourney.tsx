"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Compass, ArrowRight, Award } from "lucide-react";

type Milestone = {
  year: string;
  headline: string;
  description: string;
  importance: number;
  connections: string[];
  image?: string | null;
};

type Props = {
  currentTopic: string;
  category: string;
  subcategory: string;
  relatedList: string[];
  timeline: Milestone[] | null;
};

export default function KnowledgeJourney({
  currentTopic,
  category,
  subcategory,
  relatedList,
  timeline
}: Props) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  const parsedTimeline = useMemo(() => {
    if (timeline && timeline.length > 0) return timeline;
    return (relatedList || []).slice(0, 5).map((t, idx) => ({
      year: `Phase ${idx + 1}`,
      headline: `Timeline progression of ${t}`,
      description: `Key historical developments, research breakthroughs, and conceptual milestones related to ${t} occurred during this period.`,
      importance: 8,
      connections: [t],
      image: null
    }));
  }, [timeline, relatedList]);

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

  const activeMilestone = parsedTimeline[activeIndex] || parsedTimeline[0] || null;

  return (
    <section className="py-16 md:py-24 border-b border-white/5 animate-fade-in-up">
      {/* Editorial Header */}
      <div className="flex flex-col gap-2 mb-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400 font-mono">
          {headerDetails.subtitle}
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
          {headerDetails.title}
        </h2>
      </div>

      {/* TIMELINE INTERFACE */}
      {/* 1. DESKTOP VIEW: Vertical Museum Timeline */}
      <div className="hidden md:flex flex-row gap-12 items-stretch w-full">
        {/* Left half: The vertical museum timeline scroll list */}
        <div className="w-1/2 flex flex-col gap-6 max-h-[500px] overflow-y-auto pr-6 scrollbar-thin relative pl-6 border-l border-white/5">
          {parsedTimeline.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className="relative text-left group focus:outline-none w-full"
              >
                {/* Vertical track line connector dot */}
                <div 
                  className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border transition-all duration-500 flex items-center justify-center ${
                    isActive 
                      ? "bg-cyan-400 border-cyan-400 scale-125 shadow-[0_0_12px_rgba(34,211,238,0.6)]" 
                      : "bg-[#090A0F] border-neutral-800 group-hover:border-neutral-500"
                  }`}
                >
                  {isActive && <div className="h-1 w-1 bg-black rounded-full" />}
                </div>
                
                <div className="pl-3 transition-transform duration-300 group-hover:translate-x-1">
                  <span className={`text-xs font-mono tracking-wider font-bold transition-colors ${isActive ? "text-cyan-400" : "text-neutral-500 group-hover:text-neutral-300"}`}>
                    {item.year}
                  </span>
                  <h4 className={`text-base font-semibold mt-1 transition-colors leading-tight ${isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"}`}>
                    {item.headline}
                  </h4>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right half: Large magazine details panel */}
        <div className="w-1/2 border border-white/5 bg-gradient-to-br from-neutral-900/10 via-neutral-950/20 to-[#0c0c0f]/40 rounded-3xl p-8 flex flex-col justify-between min-h-[360px] relative overflow-hidden backdrop-blur-md">
          {/* Subtle grid backdrop inside details */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

          <AnimatePresence mode="wait">
            {activeMilestone && (
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full flex-grow flex flex-col justify-between z-10"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono tracking-wider text-neutral-500 font-bold uppercase flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                      Chronology Year
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-mono bg-cyan-400/5 border border-cyan-400/20 px-2 py-0.5 rounded text-cyan-400 uppercase font-bold">
                      <Award className="h-2.5 w-2.5" />
                      Importance: {activeMilestone.importance}/10
                    </span>
                  </div>

                  <h3 className="text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
                    {activeMilestone.year}
                  </h3>
                  
                  <h4 className="text-lg font-medium text-cyan-300 leading-snug mb-3">
                    {activeMilestone.headline}
                  </h4>
                  
                  <p className="text-base leading-relaxed text-neutral-300 font-light max-w-xl">
                    {activeMilestone.description}
                  </p>
                </div>

                {/* Sub-navigation to related articles */}
                {activeMilestone.connections && activeMilestone.connections.length > 0 && (
                  <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">Related Connections</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {activeMilestone.connections.slice(0, 3).map((conn, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => router.push(`/results?topic=${encodeURIComponent(conn)}`)}
                          className="text-xs text-cyan-400 hover:text-white bg-white/[0.02] border border-white/5 hover:border-cyan-400/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-300"
                        >
                          <span>{conn}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. MOBILE VIEW: Horizontal Swipe Timeline */}
      <div className="md:hidden w-full flex flex-col gap-6">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory pr-6">
          {parsedTimeline.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div 
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`snap-center shrink-0 w-80 border rounded-2xl p-6 transition-all duration-300 scroll-mx-6 ${
                  isActive 
                    ? "bg-[#0b0b0f] border-cyan-400/30 shadow-[0_4px_20px_rgba(6,182,212,0.15)]" 
                    : "bg-[#07080c]/60 border-white/5"
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
                
                <h4 className="text-sm font-semibold text-white truncate mb-2">
                  {item.headline}
                </h4>
                
                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                  {item.description}
                </p>

                {isActive && item.connections && item.connections.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[8px] font-mono text-neutral-500 uppercase">Explore Connection</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/results?topic=${encodeURIComponent(item.connections[0])}`);
                      }}
                      className="text-[10px] text-cyan-400 flex items-center gap-1 font-medium"
                    >
                      {item.connections[0]}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Swiper Indicators */}
        <div className="flex justify-center gap-1.5 mt-2">
          {parsedTimeline.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex ? "w-6 bg-cyan-400" : "w-1.5 bg-neutral-800"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
