"use client";

import { useState, useRef } from "react";
import { trackCarouselCardClicked } from "@/lib/gtag";

export interface CarouselCard {
  title: string;
  summary: string;
  referenceLabel: string;
  imageHint: string;
  imageUrl?: string | null;
  metadata?: Record<string, unknown>;
}

type Props = {
  cards: CarouselCard[];
  category: string;
  didYouKnow?: string[];
};

const GRADIENTS = [
  "from-violet-600/30 via-indigo-700/25 to-cyan-500/20",
  "from-emerald-500/30 via-teal-600/25 to-cyan-600/20",
  "from-pink-500/30 via-purple-600/25 to-indigo-700/20",
  "from-amber-500/30 via-orange-600/25 to-red-600/20",
  "from-blue-600/30 via-indigo-600/25 to-violet-700/20",
];

export default function Carousel({ cards, category, didYouKnow }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageErrorOrTooTall, setImageErrorOrTooTall] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleImageLoad = (index: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalHeight > img.naturalWidth * 1.1) {
      setImageErrorOrTooTall((prev) => ({ ...prev, [index]: true }));
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.clientWidth;
    const index = Math.round(scrollLeft / width);
    if (index >= 0 && index < cards.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const scrollTo = (index: number) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({
      left: width * index,
      behavior: "smooth",
    });
    setActiveIndex(index);
  };

  const handleCardClick = (card: CarouselCard) => {
    trackCarouselCardClicked(card.title);
  };

  const humanReadableCategory = (cat: string) => {
    return cat
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getGradient = (index: number) => {
    return GRADIENTS[index % GRADIENTS.length];
  };

  return (
    <section className="py-12 md:py-16">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
            {humanReadableCategory(category)} Briefing
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Analysis Perspectives
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-neutral-400">
          Scroll or swipe horizontally to view the key thematic elements of this topic.
        </p>
      </div>

      <div className="relative group/carousel">
        {/* Navigation Buttons (Desktop only, hidden on mobile/touch targets) */}
        {activeIndex > 0 && (
          <button
            onClick={() => scrollTo(activeIndex - 1)}
            className="absolute -left-6 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/80 w-12 h-12 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-cyan-400 hover:text-cyan-400 active:scale-95 md:flex shadow-2xl"
            aria-label="Previous Perspective"
          >
            <span className="text-lg">←</span>
          </button>
        )}
        {activeIndex < cards.length - 1 && (
          <button
            onClick={() => scrollTo(activeIndex + 1)}
            className="absolute -right-6 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/80 w-12 h-12 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-cyan-400 hover:text-cyan-400 active:scale-95 md:flex shadow-2xl"
            aria-label="Next Perspective"
          >
            <span className="text-lg">→</span>
          </button>
        )}

        {/* Swipe-friendly Horizontal Scroll Box */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="no-scrollbar flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth gap-6 pb-4"
        >
          {cards.map((card, index) => {
            const hasImage = !!card.imageUrl && !imageErrorOrTooTall[index];
            const themeLabel = card.referenceLabel || "Perspective";

            return (
              <div
                key={index}
                onClick={() => handleCardClick(card)}
                className="w-full shrink-0 snap-center rounded-[2rem] border border-white/5 bg-gradient-to-br from-neutral-900/40 via-neutral-950/60 to-[#0c0c0f]/80 overflow-hidden shadow-2xl backdrop-blur-xl transition duration-500 hover:border-white/10 hover:shadow-[0_0_50px_rgba(0,245,160,0.04)] flex flex-col md:flex-row min-h-[380px]"
              >
                {/* Visual Frame */}
                <div className="relative w-full md:w-2/5 min-h-[240px] md:min-h-full overflow-hidden bg-neutral-950/80 shrink-0 animate-fade-in-up">
                  {hasImage ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-transparent to-transparent z-10 md:bg-gradient-to-r md:from-transparent md:to-neutral-950/90" />
                      <img
                        src={card.imageUrl!}
                        alt={card.title}
                        loading="lazy"
                        onLoad={(e) => handleImageLoad(index, e)}
                        onError={() => setImageErrorOrTooTall(prev => ({ ...prev, [index]: true }))}
                        className="h-full w-full object-cover transition duration-700 hover:scale-105"
                      />
                    </>
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${getGradient(index)} flex flex-col items-center justify-center relative p-8`}>
                      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-[30px]" />
                      <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-violet-500/10 blur-[30px]" />
                      <span className="text-5xl drop-shadow-lg">✦</span>
                    </div>
                  )}

                  {/* Sub-theme Identifier Pill */}
                  <div className="absolute top-5 left-5 z-20 rounded-full bg-black/60 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-300 backdrop-blur-md border border-white/5 shadow-lg max-w-[80%] truncate">
                    {themeLabel}
                  </div>
                </div>

                {/* Editorial Content Frame */}
                <div className="p-6 md:p-10 flex flex-col justify-between flex-grow">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
                        Perspective {index + 1} of {cards.length}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold tracking-tight text-white transition-colors duration-300">
                      {card.title}
                    </h3>
                    
                    <p className="mt-4 text-sm md:text-base leading-relaxed text-neutral-300 font-light max-w-2xl line-clamp-[7] overflow-hidden">
                      {card.summary}
                    </p>

                    {/* Card Metadata Grid */}
                    {card.metadata && Object.keys(card.metadata).length > 0 && (
                      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3.5 rounded-2xl border border-white/5 bg-white/[0.01] p-4.5 text-xs">
                        {Object.entries(card.metadata).map(([key, val]) => {
                          const formattedKey = key === "unesco"
                            ? "UNESCO Status"
                            : key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
                          const formattedVal = Array.isArray(val) ? val.join(", ") : String(val);
                          if (!val || val === "null" || val === "undefined") return null;
                          return (
                            <div key={key} className="space-y-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block">
                                {formattedKey}
                              </span>
                              <span className="text-neutral-300 font-medium line-clamp-1">
                                {formattedVal}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-mono">Reference Topic</span>
                    <span className="text-neutral-400 transition-colors duration-300">
                      Wikipedia Visualizer
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide Navigation Pagination Indicator dots */}
      <div className="mt-6 flex items-center justify-center gap-2.5">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              activeIndex === index
                ? "w-8 bg-cyan-400"
                : "w-2 bg-neutral-700 hover:bg-neutral-600"
            }`}
            aria-label={`Show Perspective ${index + 1}`}
          />
        ))}
      </div>

      {/* Did You Know visual cards section */}
      {didYouKnow && didYouKnow.length > 0 && (
        <div className="mt-16 border-t border-white/5 pt-12 animate-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-400 mb-8 text-center md:text-left">
            Did You Know?
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {didYouKnow.map((fact, index) => (
              <div
                key={index}
                className="relative rounded-3xl border border-white/5 bg-gradient-to-b from-neutral-900/35 via-neutral-950/40 to-black p-7 flex gap-4.5 items-start hover:border-white/10 transition duration-300"
              >
                <span className="text-2xl text-cyan-400 shrink-0">💡</span>
                <p className="text-sm leading-relaxed text-neutral-300 font-light">
                  {fact}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
