"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import EditorialSlide, { EditorialSlideData } from "./EditorialSlide";
import { trackCarouselCardClicked } from "@/lib/gtag";

type Props = {
  cards: EditorialSlideData[];
  importantDates?: string[];
  statistics?: string[];
  category: string;
  thumbnail: string | null;
};

export default function EditorialCarousel({
  cards,
  importantDates = [],
  statistics = [],
  category,
  thumbnail
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for prev, 1 for next

  const handleNext = () => {
    if (activeIndex < cards.length - 1) {
      setDirection(1);
      setActiveIndex(prev => prev + 1);
      trackCarouselCardClicked(cards[activeIndex + 1].title);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setDirection(-1);
      setActiveIndex(prev => prev - 1);
      trackCarouselCardClicked(cards[activeIndex - 1].title);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, cards]);

  if (!cards || cards.length === 0) return null;

  // Slide transition variants for cinematic feel
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 30 : -30,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -30 : 30,
      opacity: 0
    })
  };

  return (
    <section className="relative py-12 md:py-20 overflow-hidden select-none border-b border-white/5">
      {/* 1. PROGRESS TRACKER */}
      <div className="max-w-4xl mx-auto px-6 mb-12 relative">
        <div className="absolute top-1/2 left-6 right-6 h-[1px] bg-neutral-800 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-6 h-[1px] bg-cyan-500/80 -translate-y-1/2 z-0 transition-all duration-500 ease-out" 
          style={{ width: `calc(${(activeIndex / (cards.length - 1)) * 100}% - 12px)` }}
        />
        <div className="relative z-10 flex justify-between items-center w-full">
          {cards.map((card, idx) => {
            const isPast = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            return (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > activeIndex ? 1 : -1);
                  setActiveIndex(idx);
                  trackCarouselCardClicked(card.title);
                }}
                className="flex flex-col items-center focus:outline-none group"
              >
                <div 
                  className={`h-3 w-3 rounded-full border transition-all duration-300 flex items-center justify-center ${
                    isCurrent 
                      ? "bg-[#07080c] border-cyan-400 scale-125 shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                      : isPast 
                        ? "bg-cyan-500 border-cyan-500" 
                        : "bg-[#07080c] border-neutral-700 group-hover:border-neutral-500"
                  }`}
                />
                <span 
                  className={`mt-2.5 text-[9px] uppercase tracking-[0.18em] font-semibold transition-all duration-300 hidden sm:block ${
                    isCurrent ? "text-cyan-400 font-bold scale-105" : "text-neutral-500 group-hover:text-neutral-300"
                  }`}
                >
                  {card.referenceLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN EDITORIAL WRAPPER */}
      <div className="max-w-4xl mx-auto px-6 relative min-h-[500px] flex items-center justify-center">
        {/* Next/Prev Navigation Triggers */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30 hidden md:block">
          <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className={`flex items-center justify-center rounded-full border w-11 h-11 text-neutral-400 bg-black/40 backdrop-blur-md transition-all duration-300 ${
              activeIndex === 0
                ? "opacity-10 border-white/5 cursor-not-allowed"
                : "border-white/10 hover:border-cyan-400 hover:text-cyan-400 hover:scale-105"
            }`}
            aria-label="Previous Chapter"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-30 hidden md:block">
          <button
            onClick={handleNext}
            disabled={activeIndex === cards.length - 1}
            className={`flex items-center justify-center rounded-full border w-11 h-11 text-neutral-400 bg-black/40 backdrop-blur-md transition-all duration-300 ${
              activeIndex === cards.length - 1
                ? "opacity-10 border-white/5 cursor-not-allowed"
                : "border-white/10 hover:border-cyan-400 hover:text-cyan-400 hover:scale-105"
            }`}
            aria-label="Next Chapter"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="w-full flex justify-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 350, damping: 35 },
                opacity: { duration: 0.25 }
              }}
              className="w-full flex justify-center"
            >
              <EditorialSlide
                card={cards[activeIndex]}
                index={activeIndex}
                isActive={true}
                importantDates={importantDates}
                statistics={statistics}
                category={category}
                slideCount={cards.length}
                thumbnail={thumbnail}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Swipe indicator for mobile */}
      <div className="mt-8 flex justify-center md:hidden">
        <div className="flex gap-4.5">
          <button 
            onClick={handlePrev} 
            disabled={activeIndex === 0} 
            className="px-4 py-2 rounded-full border border-white/5 bg-white/[0.02] text-xs text-neutral-400 disabled:opacity-20"
          >
            ← Back
          </button>
          <button 
            onClick={handleNext} 
            disabled={activeIndex === cards.length - 1} 
            className="px-4 py-2 rounded-full border border-white/5 bg-white/[0.02] text-xs text-neutral-400 disabled:opacity-20"
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}
