"use client";

import React, { useMemo } from "react";
import { Quote, Calendar, TrendingUp, Sparkles, BookOpen } from "lucide-react";

export interface EditorialSlideData {
  title: string;
  summary: string;
  referenceLabel: string;
  readerQuestion?: string;
  keyTakeaway?: string | null;
}

type Props = {
  card: EditorialSlideData;
  index: number;
  isActive: boolean;
  importantDates?: string[];
  statistics?: string[];
  category: string;
  slideCount: number;
};

export default function EditorialSlide({
  card,
  index,
  isActive,
  importantDates = [],
  statistics = [],
  category,
  slideCount
}: Props) {
  // Dynamically extract highlight quote: select the second sentence or longest sentence
  const highlightQuote = useMemo(() => {
    if (!card.summary) return "";
    const sentences = card.summary.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length >= 2) {
      return sentences[1] + ".";
    }
    return sentences[0] + ".";
  }, [card.summary]);

  // Dynamically calculate reading time
  const readingTime = useMemo(() => {
    if (!card.summary) return "1 min";
    const words = card.summary.split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.round(words / 200));
    return `${mins} min`;
  }, [card.summary]);

  // Format slide counter
  const formattedCounter = useMemo(() => {
    const current = (index + 1).toString().padStart(2, "0");
    const total = slideCount.toString().padStart(2, "0");
    return `${current} / ${total}`;
  }, [index, slideCount]);

  const humanReadableCategory = (cat: string) => {
    if (!cat) return "Topic";
    return cat
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Dynamically extract or match statistic or date
  const extractedBadge = useMemo(() => {
    if (!card.summary) return null;
    
    // Check if summary contains a percentage (e.g., 75%, 2.5x) or a year/date (e.g., 1989, 21st century)
    const matchYear = card.summary.match(/\b(17|18|19|20)\d{2}\b/);
    const matchPercent = card.summary.match(/\b\d+(\.\d+)?%/);
    const matchQuantity = card.summary.match(/\b\d+(\.\d+)?\s*(million|billion|trillion|million USD|billion USD)\b/i);

    if (matchPercent) {
      return { type: "stat", value: matchPercent[0], label: "Key Stat" };
    }
    if (matchQuantity) {
      return { type: "stat", value: matchQuantity[0], label: "Quantity" };
    }
    if (matchYear) {
      return { type: "date", value: matchYear[0], label: "Pivotal Year" };
    }

    // Fall back to structured facts arrays based on index
    if (index === 0 && importantDates.length > 0) {
      return { type: "date", value: importantDates[0], label: "Origin Date" };
    }
    if (index === 1 && statistics.length > 0) {
      return { type: "stat", value: statistics[0], label: "Key Stat" };
    }
    if (index === 2 && importantDates.length > 1) {
      return { type: "date", value: importantDates[1], label: "Milestone" };
    }
    if (index === 3 && statistics.length > 1) {
      return { type: "stat", value: statistics[1], label: "Metric" };
    }
    if (index === 4 && importantDates.length > 0) {
      return { type: "date", value: importantDates[importantDates.length - 1], label: "Legacy Date" };
    }

    return null;
  }, [card.summary, index, importantDates, statistics]);

  return (
    <div
      className={`w-full max-w-2xl shrink-0 p-8 md:p-10 rounded-[24px] transition-all duration-700 ease-out border flex flex-col justify-between min-h-[460px] md:min-h-[500px] select-none relative overflow-hidden ${
        isActive
          ? "bg-[#0a0e14]/75 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] opacity-100 scale-100 translate-y-0 filter blur-none z-20"
          : "bg-[#0a0e14]/40 border-white/5 shadow-2xl opacity-40 scale-90 translate-y-2 filter blur-[2px] z-10 pointer-events-none"
      }`}
    >
      {/* Decorative Glow inside active card */}
      {isActive && (
        <>
          <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-cyan-500/10 blur-[40px] pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-44 w-44 rounded-full bg-purple-500/5 blur-[40px] pointer-events-none" />
        </>
      )}

      {/* Slide Meta Indicators (Slide count, reading time, category badge) */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5 text-neutral-400">
        <span className="text-[10px] font-mono tracking-wider font-semibold">
          {formattedCounter}
        </span>
        <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold">
          <BookOpen className="h-3 w-3 text-neutral-500" />
          {readingTime} read
        </span>
        <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/20 border border-cyan-400/20 text-[8px] font-bold uppercase tracking-widest text-cyan-400">
          {humanReadableCategory(category)}
        </span>
      </div>

      {/* Main Chapter Headers & Content */}
      <div className="flex-grow space-y-5">
        <div>
          {/* Chapter Label */}
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-500 block mb-1">
            {card.referenceLabel}
          </span>
          {/* Chapter Title */}
          <h3 className="text-2xl font-bold tracking-tight text-white leading-tight md:text-3xl bg-gradient-to-r from-white to-neutral-200 bg-clip-text text-transparent">
            {card.title}
          </h3>
          {/* Question Subtitle */}
          {card.readerQuestion && (
            <p className="mt-2 text-xs font-light text-cyan-400/80 italic">
              {card.readerQuestion}
            </p>
          )}
        </div>

        {/* Narrative Paragraph (70-90 words) */}
        <p className="text-sm md:text-base leading-relaxed text-neutral-300 font-light max-w-xl">
          {card.summary}
        </p>

        {/* Highlight quotation */}
        {highlightQuote && (
          <div className="relative border-l-2 border-cyan-400/40 pl-4 py-1.5 bg-white/[0.01] rounded-r-xl pr-4">
            <Quote className="absolute top-1.5 left-1 h-3 w-3 text-cyan-400/25 rotate-180" />
            <p className="text-xs italic text-cyan-300/90 font-light leading-relaxed">
              “{highlightQuote}”
            </p>
          </div>
        )}
      </div>

      {/* Bottom Row: Key Takeaway and Metrics */}
      <div className="mt-6 pt-5 border-t border-white/5 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        {/* Key Takeaway */}
        {card.keyTakeaway && (
          <div className="flex-grow space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              Key Takeaway
            </span>
            <p className="text-xs text-neutral-200 font-normal leading-relaxed max-w-md">
              {card.keyTakeaway}
            </p>
          </div>
        )}

        {/* Timeline Badge & Swipe indicator */}
        <div className="flex flex-col items-end shrink-0 gap-2">
          {extractedBadge && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02]">
              {extractedBadge.type === "date" ? (
                <Calendar className="h-3.5 w-3.5 text-cyan-400/80" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 text-purple-400/80" />
              )}
              <span className="text-[9px] font-semibold text-neutral-300 uppercase tracking-wider">
                {extractedBadge.value}
              </span>
            </div>
          )}

          {/* Swipe Indicator (Visible only on active card) */}
          {isActive && index < slideCount - 1 && (
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-cyan-400/70 animate-pulse mt-1 select-none">
              Swipe to explore →
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
