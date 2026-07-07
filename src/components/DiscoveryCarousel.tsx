"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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
    <section className="py-12 border-t border-white/5 animate-fade-in-up relative">
      <div className="flex items-center justify-between mb-8 px-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
            Discovery Hub
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            People Also Explored
          </h2>
        </div>

        {/* Carousel buttons */}
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => scrollBy(-300)}
            disabled={!showLeftArrow}
            className={`flex items-center justify-center rounded-full border w-9 h-9 text-white bg-black/60 backdrop-blur-md transition-all duration-300 ${
              !showLeftArrow
                ? "opacity-20 border-white/5 cursor-not-allowed"
                : "border-white/10 hover:border-cyan-400 hover:text-cyan-400 hover:scale-105 active:scale-95"
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(300)}
            disabled={!showRightArrow}
            className={`flex items-center justify-center rounded-full border w-9 h-9 text-white bg-black/60 backdrop-blur-md transition-all duration-300 ${
              !showRightArrow
                ? "opacity-20 border-white/5 cursor-not-allowed"
                : "border-white/10 hover:border-cyan-400 hover:text-cyan-400 hover:scale-105 active:scale-95"
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Swipeable Snap Scroll Track */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="no-scrollbar flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth gap-5 pb-4 cursor-grab active:cursor-grabbing"
      >
        {topics.map((item) => {
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => handleCardClick(item.title)}
              className="group flex-none w-[72%] sm:w-[35%] md:w-[calc(20%-16px)] snap-start text-left premium-card p-4.5 flex flex-col justify-between min-h-[250px] hover:border-cyan-500/25 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.06)] hover:-translate-y-1.5 duration-300 border border-white/5"
            >
              <div>
                {/* Visual Thumbnail */}
                <div className="h-28 w-full rounded-xl overflow-hidden bg-neutral-950 border border-white/5 flex items-center justify-center relative mb-4">
                  {item.thumbnail ? (
                    <>
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                    </>
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 flex items-center justify-center relative">
                      <div className="absolute -left-5 -top-5 h-16 w-16 rounded-full bg-cyan-500/5 blur-[20px]" />
                      <div className="absolute -right-5 -bottom-5 h-16 w-16 rounded-full bg-purple-500/5 blur-[20px]" />
                      <Sparkles className="h-8 w-8 text-neutral-700 group-hover:text-cyan-500/30 group-hover:scale-110 transition-all duration-500" />
                    </div>
                  )}
                  {/* Category badge */}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/5 text-[8px] font-bold uppercase tracking-wider text-cyan-400">
                    {item.category || "Topic"}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition duration-300 line-clamp-1 leading-snug">
                  {item.title}
                </h3>

                {item.description && (
                  <p className="mt-1.5 text-xs text-neutral-400 font-light line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                <span>Explore</span>
                <span className="text-neutral-400 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all duration-300">
                  →
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
