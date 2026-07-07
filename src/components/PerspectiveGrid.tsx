"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, MessageSquare } from "lucide-react";
import { trackCarouselCardClicked } from "@/lib/gtag";

export interface PerspectiveCard {
  title: string;
  summary: string;
  referenceLabel: string;
  readerQuestion: string;
  keyTakeaway?: string | null;
}

type Props = {
  cards: PerspectiveCard[];
  category: string;
};

const gridContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 25 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 110,
      damping: 15
    }
  }
};

export default function PerspectiveGrid({ cards, category }: Props) {
  const [selectedCard, setSelectedCard] = useState<PerspectiveCard | null>(null);

  const handleCardClick = (card: PerspectiveCard) => {
    trackCarouselCardClicked(card.title);
    setSelectedCard(card);
  };

  const humanReadableCategory = (cat: string) => {
    if (!cat) return "Topic";
    return cat
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <section className="py-12 border-t border-white/5 animate-fade-in-up">
      <div className="flex flex-col gap-2 mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
          {humanReadableCategory(category)} Perspectives
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Analysis Perspectives
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-neutral-400 mt-1 font-light">
          Explore deeper analysis dimensions of this topic. Click any card to expand.
        </p>
      </div>

      <motion.div
        variants={gridContainerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((card, index) => {
          return (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{
                y: -6,
                scale: 1.02,
                borderColor: "rgba(6, 182, 212, 0.25)",
                boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5), 0 0 25px rgba(6, 182, 212, 0.08)"
              }}
              onClick={() => handleCardClick(card)}
              className="group relative flex flex-col justify-between p-6.5 cursor-pointer min-h-[290px] h-full premium-card"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full bg-white/[0.03] border border-white/5 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.20em] text-neutral-400 group-hover:text-cyan-400 transition-colors duration-300">
                    {card.referenceLabel || `Perspective ${index + 1}`}
                  </span>
                </div>

                <h3 className="text-lg font-bold tracking-tight text-white group-hover:text-cyan-200 transition-colors duration-300 line-clamp-2 leading-snug">
                  {card.title}
                </h3>

                {card.readerQuestion && (
                  <p className="mt-2 text-xs font-light text-neutral-400 italic flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3 text-cyan-500/40" />
                    <span className="line-clamp-1">{card.readerQuestion}</span>
                  </p>
                )}

                <p className="mt-4 text-xs leading-relaxed text-neutral-300 font-light line-clamp-[6] overflow-hidden">
                  {card.summary}
                </p>
              </div>

              {card.keyTakeaway && (
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                  <span>Takeaway</span>
                  <span className="text-cyan-400 group-hover:translate-x-1 transition-all duration-300">
                    →
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* PREMIUM DETAILS MODAL OVERLAY */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCard(null)}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative p-8 md:p-10 rounded-[28px] max-w-2xl w-full border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] bg-[#0a0e14]/90 backdrop-blur-2xl space-y-6"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="absolute top-6 right-6 p-2 rounded-full border border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white hover:border-cyan-400 transition-colors duration-300"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header Label */}
              <div>
                <span className="rounded-full bg-cyan-950/20 border border-cyan-400/20 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                  {selectedCard.referenceLabel || "Analysis"}
                </span>
                <h3 className="text-2xl font-bold tracking-tight text-white leading-tight md:text-3xl mt-5 pr-8">
                  {selectedCard.title}
                </h3>
                {selectedCard.readerQuestion && (
                  <p className="mt-3 text-xs font-light text-neutral-400 italic bg-white/[0.01] border border-white/5 px-3 py-2 rounded-xl flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Reader query: {selectedCard.readerQuestion}</span>
                  </p>
                )}
              </div>

              {/* Body explanation */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <p className="text-sm md:text-base leading-relaxed text-neutral-200 font-light">
                  {selectedCard.summary}
                </p>
              </div>

              {/* Takeaway footer */}
              {selectedCard.keyTakeaway && (
                <div className="border-t border-white/5 pt-5 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-950/25 border border-cyan-400/20 shrink-0">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                      Key Takeaway
                    </span>
                    <p className="text-xs italic text-cyan-300 font-light leading-relaxed">
                      {selectedCard.keyTakeaway}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
