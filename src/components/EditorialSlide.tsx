"use client";

import React, { useMemo } from "react";
import { BookOpen, Compass, ArrowRight } from "lucide-react";

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
  
  // Extract pull quote (second sentence if exists, else first)
  const pullQuote = useMemo(() => {
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

  return (
    <div
      className={`w-full transition-all duration-700 ease-out flex flex-col lg:flex-row gap-12 lg:gap-16 items-start py-8 ${
        isActive ? "opacity-100 scale-100 relative" : "opacity-0 scale-95 pointer-events-none absolute"
      }`}
    >
      {/* LEFT CONTENT COLUMN: TYPOGRAPHY AND LAYOUT */}
      <div className="flex-1 space-y-8 max-w-2xl">
        {/* Meta Header */}
        <div className="flex items-center gap-4 text-[10px] font-mono tracking-widest font-bold text-neutral-500 uppercase">
          <span className="text-cyan-400 font-extrabold">CHAPTER {(index + 1).toString().padStart(2, "0")}</span>
          <span>/</span>
          <span>{readingTime} READ</span>
          <span>/</span>
          <span>{humanReadableCategory(category)}</span>
        </div>

        {/* Headline and Question */}
        <div className="space-y-4">
          <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {card.title}
          </h3>
          {card.readerQuestion && (
            <div className="flex items-center gap-2 text-cyan-400/90 font-mono text-xs uppercase tracking-wider font-semibold">
              <Compass className="h-4 w-4 shrink-0" />
              <span>{card.readerQuestion}</span>
            </div>
          )}
        </div>

        {/* Paragraph Body with 60-75 character width constraint & premium readability */}
        <p className="text-lg md:text-xl leading-relaxed md:leading-loose text-neutral-300 font-light tracking-wide max-w-[65ch]">
          {card.summary}
        </p>

        {/* Pull Quote section */}
        {pullQuote && (
          <blockquote className="border-l-2 border-cyan-400 pl-6 py-1 italic text-cyan-200/90 text-sm md:text-base font-light leading-relaxed max-w-xl">
            “{pullQuote}”
          </blockquote>
        )}

        {/* Key Takeaway Highlight Box */}
        {card.keyTakeaway && (
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 max-w-xl">
            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block mb-2 font-mono">
              Key Insight
            </span>
            <p className="text-xs md:text-sm text-neutral-200 font-light leading-relaxed">
              {card.keyTakeaway}
            </p>
          </div>
        )}

        {/* Flow Indicator */}
        {index < slideCount - 1 && (
          <div className="pt-4 flex items-center gap-2 text-xs text-neutral-500 uppercase tracking-widest font-semibold font-mono">
            <span>Next Chapter</span>
            <ArrowRight className="h-3 w-3 text-cyan-400 animate-pulse" />
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: HERO IMAGE FOR MAGAZINE FEEL */}
      {thumbnail && (
        <div className="w-full lg:w-[320px] shrink-0 aspect-[4/5] rounded-3xl overflow-hidden bg-neutral-900 border border-white/5 shadow-2xl relative group">
          <img 
            src={thumbnail} 
            alt={card.title} 
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
          {/* Magazine vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090A0F] via-transparent to-transparent pointer-events-none" />
        </div>
      )}
    </div>
  );
}
