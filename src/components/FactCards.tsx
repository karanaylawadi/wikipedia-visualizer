"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lightbulb, Sparkles, Award, Globe, Compass, BookOpen } from "lucide-react";

type Props = {
  facts: string[];
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 15
    }
  }
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
  if (!facts || facts.length === 0) return null;

  const visibleFacts = facts.slice(0, 5);

  return (
    <section className="py-16 md:py-24 border-b border-white/5 animate-fade-in-up">
      <div className="flex flex-col gap-2 mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
          Surprising Insights
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Did You Know?
        </h2>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {visibleFacts.map((fact, index) => {
          const Icon = ICONS[index % ICONS.length];
          const label = LABELS[index % LABELS.length];
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{
                y: -5,
                borderColor: "rgba(6, 182, 212, 0.2)",
                backgroundColor: "rgba(255, 255, 255, 0.02)"
              }}
              className="group border border-white/5 bg-[#07080c]/50 p-6.5 rounded-2xl flex flex-col justify-between min-h-[170px] transition-all duration-300 cursor-default select-none"
            >
              <div className="flex items-center justify-between w-full mb-4">
                <div className="p-2 rounded-xl bg-cyan-950/15 border border-cyan-500/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-cyan-400 transition-transform duration-500 group-hover:rotate-12" />
                </div>
                <span className="text-[8px] font-mono font-bold tracking-widest text-neutral-500 uppercase">
                  {label}
                </span>
              </div>
              
              <p className="text-sm leading-relaxed text-neutral-300 font-light flex-grow">
                {fact}
              </p>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[8px] font-mono tracking-widest text-neutral-600">
                <span>INSIGHT 0{index + 1}</span>
                <span>SECURE ARCHIVE</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
