"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

type Props = {
  facts: string[];
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 110,
      damping: 14
    }
  }
};

export default function FactCards({ facts }: Props) {
  if (!facts || facts.length === 0) return null;

  // Render exactly 5 facts as required by V12
  const visibleFacts = facts.slice(0, 5);

  return (
    <section className="py-12 border-t border-white/5 animate-fade-in-up">
      <div className="flex flex-col gap-2 mb-8">
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
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{
                y: -6,
                scale: 1.02,
                borderColor: "rgba(0, 245, 160, 0.25)",
                boxShadow: "0 12px 35px rgba(0, 0, 0, 0.5), 0 0 20px rgba(6, 182, 212, 0.05)"
              }}
              className="premium-card p-6.5 flex gap-4.5 items-start cursor-default select-none"
            >
              <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/10 flex items-center justify-center shrink-0 group transition-all duration-300">
                <Lightbulb className="h-5 w-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]" />
              </div>
              
              <p className="text-sm leading-relaxed text-neutral-300 font-light">
                {fact}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
