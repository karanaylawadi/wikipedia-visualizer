"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { trackRelatedTopicClicked } from "@/lib/gtag";

export interface ExploreTopic {
  title: string;
  description: string;
  thumbnail: string | null;
  category: string;
}

type Props = {
  topics: ExploreTopic[];
};

export default function DiscoveryCarousel({ topics }: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  if (!topics || topics.length === 0) return null;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollBy = (offset: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: offset,
      behavior: "smooth"
    });
  };

  const handleCardClick = (title: string) => {
    trackRelatedTopicClicked(title);
    router.push(`/results?topic=${encodeURIComponent(title)}`);
  };

  return (
    <section className="py-16 md:py-24 border-b border-white/5 animate-fade-in-up relative">
      <div className="flex items-center justify-between mb-10 px-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
            Related Journeys
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Continue the Journey
          </h2>
        </div>

        {/* Carousel buttons */}
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => scrollBy(-400)}
            disabled={!showLeftArrow}
            className={`flex items-center justify-center rounded-full border w-10 h-10 text-white bg-black/60 backdrop-blur-md transition-all duration-300 ${
              !showLeftArrow
                ? "opacity-20 border-white/5 cursor-not-allowed"
                : "border-white/10 hover:border-cyan-400 hover:text-cyan-400 hover:scale-105 active:scale-95"
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scrollBy(400)}
            disabled={!showRightArrow}
            className={`flex items-center justify-center rounded-full border w-10 h-10 text-white bg-black/60 backdrop-blur-md transition-all duration-300 ${
              !showRightArrow
                ? "opacity-20 border-white/5 cursor-not-allowed"
                : "border-white/10 hover:border-cyan-400 hover:text-cyan-400 hover:scale-105 active:scale-95"
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Swipeable Snap Scroll Track: exactly 3 cards visible simultaneously on desktop */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="no-scrollbar flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth gap-6 pb-4 cursor-grab active:cursor-grabbing"
      >
        {topics.map((item) => {
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => handleCardClick(item.title)}
              className="group flex-none w-[85%] sm:w-[48%] md:w-[calc(33.33%-16px)] snap-start text-left border border-white/5 bg-[#07080c]/50 p-5 flex flex-col justify-between min-h-[380px] rounded-2xl hover:border-cyan-500/20 hover:bg-white/[0.01] transition-all duration-300"
            >
              <div className="w-full">
                {/* Visual Thumbnail */}
                <div className="h-48 w-full rounded-xl overflow-hidden bg-neutral-900 border border-white/5 flex items-center justify-center relative mb-5">
                  {item.thumbnail ? (
                    <>
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    </>
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-neutral-950 to-neutral-900 flex items-center justify-center relative">
                      <Sparkles className="h-10 w-10 text-neutral-800 group-hover:text-cyan-500/20 group-hover:scale-110 transition-all duration-500" />
                    </div>
                  )}
                  {/* Category badge */}
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/5 text-[8px] font-bold uppercase tracking-widest text-cyan-400">
                    {item.category || "Topic"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition duration-300 line-clamp-1 leading-snug">
                  {item.title}
                </h3>

                {item.description && (
                  <p className="mt-2.5 text-xs text-neutral-400 font-light line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 group-hover:text-cyan-400 transition-colors duration-300">
                <span>Explore Journey</span>
                <span className="text-neutral-400 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all duration-300">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
