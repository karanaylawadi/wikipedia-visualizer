"use client";

import React, { useMemo } from "react";
import { Quote, Calendar, TrendingUp, BookOpen, User } from "lucide-react";
import { motion } from "framer-motion";

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
  thumbnail: string | null;
};

export default function EditorialSlide({
  card,
  index,
  isActive,
  importantDates = [],
  statistics = [],
  category,
  slideCount,
  thumbnail
}: Props) {
  
  // Extract highlight quote (first or second sentence)
  const highlightQuote = useMemo(() => {
    if (!card.summary) return "";
    const sentences = card.summary.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length >= 2) {
      return sentences[1] + ".";
    }
    return sentences[0] + ".";
  }, [card.summary]);

  // Reading time
  const readingTime = useMemo(() => {
    if (!card.summary) return "1 min";
    const words = card.summary.split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.round(words / 200));
    return `${mins} min`;
  }, [card.summary]);

  const humanReadableCategory = (cat: string) => {
    if (!cat) return "Topic";
    return cat
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Determine badge values
  const extractedBadge = useMemo(() => {
    if (!card.summary) return null;
    const matchYear = card.summary.match(/\b(17|18|19|20)\d{2}\b/);
    const matchPercent = card.summary.match(/\b\d+(\.\d+)?%/);

    if (matchPercent) {
      return { type: "stat", value: matchPercent[0] };
    }
    if (matchYear) {
      return { type: "date", value: matchYear[0] };
    }
    if (index === 0 && importantDates.length > 0) {
      return { type: "date", value: importantDates[0] };
    }
    if (index === 1 && statistics.length > 0) {
      return { type: "stat", value: statistics[0] };
    }
    return null;
  }, [card.summary, index, importantDates, statistics]);

  return (
    <div
      className={`w-full transition-all duration-700 ease-out border border-white/5 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row gap-10 items-stretch min-h-[480px] bg-[#07080c]/80 backdrop-blur-md relative ${
        isActive ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none absolute"
      }`}
    >
      {/* LEFT CONTENT COLUMN */}
      <div className="flex-grow flex flex-col justify-between space-y-6 md:max-w-[560px]">
        <div>
          {/* Metadata Row */}
          <div className="flex items-center gap-4 text-[10px] font-mono tracking-wider font-semibold text-neutral-500 mb-4">
            <span className="text-cyan-400 font-bold">CHAPTER {(index + 1).toString().padStart(2, "0")}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {readingTime} READ
            </span>
            <span>•</span>
            <span>{humanReadableCategory(category).toUpperCase()}</span>
          </div>

          {/* Reference Label & Large Headline */}
          <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-400 block mb-1">
            {card.referenceLabel}
          </span>
          <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight bg-gradient-to-r from-white to-neutral-200 bg-clip-text text-transparent">
            {card.title}
          </h3>
          {card.readerQuestion && (
            <p className="mt-2 text-xs font-light text-cyan-400/80 italic font-mono uppercase tracking-wider">
              {card.readerQuestion}
            </p>
          )}

          {/* Narrative Summary Body */}
          <p className="mt-6 text-sm md:text-base leading-relaxed text-neutral-300 font-light max-w-xl">
            {card.summary}
          </p>
        </div>

        {/* Pull Quote */}
        {highlightQuote && (
          <div className="relative border-l border-cyan-400/30 pl-4 py-1.5 bg-white/[0.01] rounded-r-xl pr-4">
            <p className="text-xs italic text-cyan-300/80 font-light leading-relaxed">
              “{highlightQuote}”
            </p>
          </div>
        )}

        {/* Bottom takeaway details */}
        {card.keyTakeaway && (
          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-neutral-400">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500 block mb-0.5">
                Key Takeaway
              </span>
              <p className="text-xs text-neutral-200 font-normal leading-relaxed max-w-sm">
                {card.keyTakeaway}
              </p>
            </div>

            {extractedBadge && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] self-start sm:self-center">
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
          </div>
        )}
      </div>

      {/* RIGHT EDITORIAL IMAGE COLUMN */}
      {thumbnail && (
        <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-72 relative">
          <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-neutral-900 shadow-2xl relative group">
            <img 
              src={thumbnail} 
              alt={card.title} 
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            {/* Elegant vignette shade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
}
