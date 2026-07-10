"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Sparkles, Award, Globe, Compass, BookOpen, ArrowRight, X } from "lucide-react";

type SurprisingInsight = {
  fact: string;
  surpriseScore: number;
  readMoreTopic?: string;
};

type Props = {
  facts: Array<string | SurprisingInsight>;
};

const ICONS = [Lightbulb, Sparkles, Award, Globe, Compass, BookOpen];
const LABELS = [
  "Unexpected Fact",
  "Secret History",
  "Factual Insight",
  "Global Impact",
  "Uncommon Trivia",
  "Archival Record"
];

export default function FactCards({ facts }: Props) {
  const router = useRouter();
  const [selectedInsight, setSelectedInsight] = useState<SurprisingInsight | null>(null);

  const parsedFacts = useMemo(() => {
    if (!facts || facts.length === 0) return [];
    return facts
      .map((f, index) => {
        if (typeof f === "string") {
          return {
            fact: f,
            surpriseScore: 10 - index,
            readMoreTopic: undefined
          };
        }
        return f;
      })
      .sort((a, b) => b.surpriseScore - a.surpriseScore);
  }, [facts]);

  if (parsedFacts.length === 0) return null;

  return (
    <section className="py-16 md:py-24 border-b border-white/5 animate-fade-in-up">
      {/* Section Header */}
      <div className="flex flex-col gap-2 mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400 font-mono">
          Signature Insights
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
          Did You Know?
        </h2>
      </div>

      {/* Grid List */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {parsedFacts.map((item, index) => {
          const Icon = ICONS[index % ICONS.length];
          const label = LABELS[index % LABELS.length];
          return (
            <motion.div
              key={index}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedInsight(item)}
              className="group border border-white/5 bg-[#07080c]/30 hover:bg-[#0b0b0f]/50 hover:border-cyan-400/20 p-6 rounded-2xl flex flex-col justify-between min-h-[180px] transition-all duration-300 cursor-pointer select-none"
            >
              <div className="flex items-center justify-between w-full mb-4">
                <div className="p-2 rounded-xl bg-cyan-950/10 border border-cyan-500/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-cyan-400" />
                </div>
                <span className="text-[9px] font-mono font-bold bg-cyan-400/5 px-2 py-0.5 rounded text-cyan-400">
                  Surprise: {item.surpriseScore}/10
                </span>
              </div>
              
              <p className="text-sm leading-relaxed text-neutral-300 font-light flex-grow">
                {item.fact}
              </p>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[8px] font-mono tracking-widest text-neutral-600">
                <span>INSIGHT 0{index + 1}</span>
                <span className="text-cyan-400/80 group-hover:text-cyan-400 transition-colors duration-200">
                  CLICK TO EXPAND →
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* DETAILED EXPANSION DRAWER/OVERLAY MODAL */}
      <AnimatePresence>
        {selectedInsight && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInsight(null)}
              className="absolute inset-0 bg-[#030303]"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg rounded-3xl border border-white/5 bg-[#0b0b0f] p-8 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-10 overflow-hidden"
            >
              {/* Decorative radial blur inside modal */}
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-[40px] pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedInsight(null)}
                className="absolute right-6 top-6 p-2 rounded-full border border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white transition-colors duration-200"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono bg-cyan-400/10 px-3 py-1 rounded text-cyan-400 font-bold uppercase tracking-wider">
                    Surprise Index: {selectedInsight.surpriseScore}/10
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                    Verified Connection
                  </span>
                </div>

                <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
                  Did You Know?
                </h3>

                <p className="text-base md:text-lg leading-relaxed text-neutral-300 font-light">
                  {selectedInsight.fact}
                </p>

                {selectedInsight.readMoreTopic && (
                  <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
                      Explore Connection
                    </span>
                    <button
                      onClick={() => {
                        setSelectedInsight(null);
                        router.push(`/results?topic=${encodeURIComponent(selectedInsight.readMoreTopic!)}`);
                      }}
                      className="text-xs text-cyan-400 font-medium flex items-center gap-1.5 hover:text-white transition duration-300"
                    >
                      <span>{selectedInsight.readMoreTopic}</span>
                      <ArrowRight className="h-3.5 w-3.5 animate-pulse" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
