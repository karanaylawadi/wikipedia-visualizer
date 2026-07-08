"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Sparkles, Map, Calendar, ArrowRight } from "lucide-react";

type Milestone = {
  year: string;
  event: string;
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
    // Fallback if no timeline exists: generate from relatedList
    return (relatedList || []).slice(0, 5).map((t, idx) => ({
      year: `Phase 0${idx + 1}`,
      event: `Pivotal landmark connected to ${t}.`
    }));
  }, [timeline, relatedList]);

  const headerDetails = useMemo(() => {
    const cat = category.toLowerCase();
    if (cat.includes("history") || cat.includes("war") || cat.includes("empire") || cat.includes("event")) {
      return { title: "Historical Timeline", subtitle: "Geopolitical campaigns & historic eras" };
    }
    if (cat.includes("movie") || cat.includes("tv series") || cat.includes("book") || cat.includes("creative")) {
      return { title: "Production Timeline", subtitle: "Development history, releases, and reviews" };
    }
    if (cat.includes("person") || cat.includes("artist") || cat.includes("biography")) {
      return { title: "Life Timeline", subtitle: "Personal lifespans, contributions, and key milestones" };
    }
    if (cat.includes("company") || cat.includes("brand") || cat.includes("corporation")) {
      return { title: "Company Milestones", subtitle: "Founding, expansions, and structural achievements" };
    }
    if (cat.includes("tech") || cat.includes("programming")) {
      return { title: "Version History", subtitle: "Architectural iterations & release progression" };
    }
    return { title: "Chronological Milestones", subtitle: "Milestones and chronological timeline points" };
  }, [category]);

  const activeMilestone = parsedTimeline[activeIndex] || parsedTimeline[0] || null;

  return (
    <section className="py-16 md:py-24 border-b border-white/5 animate-fade-in-up">
      <div className="flex flex-col gap-2 mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
          {headerDetails.subtitle}
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          {headerDetails.title}
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-stretch w-full">
        {/* LEFT COLUMN: VERTICAL TIMELINE LIST */}
        <div className="md:w-1/2 flex flex-col gap-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar relative pl-4 border-l border-white/10">
          {parsedTimeline.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className="relative text-left group focus:outline-none"
              >
                {/* Visual timeline bullet */}
                <div 
                  className={`absolute -left-[22px] top-1.5 h-3 w-3 rounded-full border transition-all duration-300 ${
                    isActive 
                      ? "bg-cyan-400 border-cyan-400 scale-125 shadow-[0_0_8px_rgba(6,182,212,0.4)]" 
                      : "bg-[#07080c] border-neutral-700 group-hover:border-neutral-500"
                  }`}
                />
                
                <div className="pl-2">
                  <span className={`text-[10px] font-mono tracking-wider font-bold transition-colors ${isActive ? "text-cyan-400" : "text-neutral-500 group-hover:text-neutral-300"}`}>
                    {item.year}
                  </span>
                  <p className={`text-xs mt-1 transition-all duration-300 line-clamp-1 leading-snug ${isActive ? "text-white font-medium pl-1" : "text-neutral-400 group-hover:text-neutral-200"}`}>
                    {item.event}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT COLUMN: LARGE DETAILS PANEL */}
        <div className="md:w-1/2 border border-white/5 bg-[#07080c]/50 rounded-2xl p-8 relative flex flex-col justify-between min-h-[220px]">
          <AnimatePresence mode="wait">
            {activeMilestone && (
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full flex-grow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-[9px] font-mono tracking-wider text-cyan-400 font-bold uppercase mb-2">
                    <Calendar className="h-3 w-3" />
                    <span>MILESTONE YEAR</span>
                  </div>
                  
                  <h3 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-none mb-4 font-mono">
                    {activeMilestone.year}
                  </h3>
                  
                  <p className="text-sm md:text-base leading-relaxed text-neutral-300 font-light">
                    {activeMilestone.event}
                  </p>
                </div>

                {/* Sub-navigation to related articles */}
                {relatedList && relatedList[activeIndex % relatedList.length] && (
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Explore Connection</span>
                    <button
                      onClick={() => router.push(`/results?topic=${encodeURIComponent(relatedList[activeIndex % relatedList.length])}`)}
                      className="text-xs text-cyan-400 font-medium flex items-center gap-1.5 hover:text-white transition duration-300"
                    >
                      <span>{relatedList[activeIndex % relatedList.length]}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
