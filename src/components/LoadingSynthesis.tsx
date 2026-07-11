"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  topic: string;
};

const STATUS_MESSAGES = [
  "Reading the Wikipedia source article...",
  "Mapping connected concepts...",
  "Generating editorial briefing...",
];

// Fixed node/edge layout for the decorative synthesis visual — a stylized
// neural-network motif, not a generated image asset (see V19 plan risk
// note: avoid heavy illustration assets on the loading path).
const NODES = [
  { cx: 60, cy: 90, r: 4 },
  { cx: 110, cy: 50, r: 3 },
  { cx: 150, cy: 110, r: 5 },
  { cx: 200, cy: 60, r: 3 },
  { cx: 240, cy: 100, r: 4 },
  { cx: 100, cy: 140, r: 3 },
  { cx: 180, cy: 150, r: 4 },
  { cx: 260, cy: 50, r: 3 },
];

const EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 5],
  [2, 6],
  [4, 7],
  [5, 6],
];

export default function LoadingSynthesis({ topic }: Props) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="flex min-h-[75vh] flex-col items-center justify-center text-center animate-fade-in-up">
      {/* Decorative neural-network visual */}
      <div className="relative mb-10 h-[180px] w-[300px]">
        <div className="glow-cyan radial-glow absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 opacity-40" />
        <svg viewBox="0 0 300 180" className="relative h-full w-full" fill="none">
          {EDGES.map(([a, b], idx) => (
            <line
              key={idx}
              x1={NODES[a].cx}
              y1={NODES[a].cy}
              x2={NODES[b].cx}
              y2={NODES[b].cy}
              stroke="rgba(0,245,160,0.25)"
              strokeWidth="1"
              className="journey-glow-line"
            />
          ))}
          {NODES.map((node, idx) => (
            <circle
              key={idx}
              cx={node.cx}
              cy={node.cy}
              r={node.r}
              fill="#00f5a0"
              className="animate-pulse"
              style={{ animationDelay: `${idx * 0.15}s` }}
            />
          ))}
        </svg>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-cyan-400">
        AI Knowledge Synthesis
      </p>
      <h1 className="mt-5 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
        Synthesizing Briefing
      </h1>

      <div className="mt-6 h-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-neutral-500"
          >
            {STATUS_MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-neutral-600">
        {topic}
      </p>
    </section>
  );
}
