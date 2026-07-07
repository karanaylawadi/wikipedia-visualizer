"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EditorialSlide, { EditorialSlideData } from "./EditorialSlide";
import { trackCarouselCardClicked } from "@/lib/gtag";

type Props = {
  cards: EditorialSlideData[];
  importantDates?: string[];
  statistics?: string[];
  category: string;
};

export default function EditorialCarousel({ cards, importantDates = [], statistics = [], category }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWheelTime = useRef(0);

  const handleNext = () => {
    if (activeIndex < cards.length - 1) {
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      trackCarouselCardClicked(cards[nextIndex].title);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      const prevIndex = activeIndex - 1;
      setActiveIndex(prevIndex);
      trackCarouselCardClicked(cards[prevIndex].title);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in search bar or input fields
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(cards.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, cards]);

  // Trackpad / Mouse wheel horizontal swipe handling
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 700) return; // Debounce to allow complete spring animation

    const deltaX = e.deltaX;
    const deltaY = e.deltaY;

    // Detect horizontal scroll or trackpad swipe
    if (Math.abs(deltaX) > 30) {
      if (deltaX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
      lastWheelTime.current = now;
    } else if (Math.abs(deltaY) > 60 && e.shiftKey) {
      // Shift + vertical wheel is mapped as horizontal scroll in browsers
      if (deltaY > 0) {
        handleNext();
      } else {
        handlePrev();
      }
      lastWheelTime.current = now;
    }
  };

  // Drag handler for touch devices and mouse swipe gestures
  const handleDragEnd = (event: any, info: any) => {
    const threshold = 40; // minimum distance in px to trigger swipe
    if (info.offset.x < -threshold) {
      handleNext();
    } else if (info.offset.x > threshold) {
      handlePrev();
    }
  };

  if (!cards || cards.length === 0) return null;

  return (
    <section className="relative py-6 md:py-16 overflow-hidden select-none">
      <div className="max-w-5xl mx-auto px-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">
            Editorial Storyline
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white mt-1">
            Editorial chapters
          </h2>
        </div>
        <div className="hidden md:flex gap-2.5">
          <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className={`flex items-center justify-center rounded-full border w-11 h-11 text-white bg-black/60 backdrop-blur-md transition-all duration-300 ${
              activeIndex === 0
                ? "opacity-30 border-white/5 cursor-not-allowed"
                : "border-white/10 hover:border-cyan-400 hover:text-cyan-400 hover:scale-105 active:scale-95"
            }`}
            aria-label="Previous Chapter"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            disabled={activeIndex === cards.length - 1}
            className={`flex items-center justify-center rounded-full border w-11 h-11 text-white bg-black/60 backdrop-blur-md transition-all duration-300 ${
              activeIndex === cards.length - 1
                ? "opacity-30 border-white/5 cursor-not-allowed"
                : "border-white/10 hover:border-cyan-400 hover:text-cyan-400 hover:scale-105 active:scale-95"
            }`}
            aria-label="Next Chapter"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Outer visible edge overflow wrapper */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="relative w-full overflow-visible flex justify-center py-4"
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          animate={{
            x: `${(cards.length / 2 - 0.5 - activeIndex) * 100}%`
          }}
          transition={{
            type: "spring",
            stiffness: 140,
            damping: 18,
            mass: 0.8
          }}
          style={{ x: 0 }}
          className="flex gap-6 w-[85%] md:w-[600px] shrink-0 justify-center cursor-grab active:cursor-grabbing"
        >
          {cards.map((card, index) => {
            const isActive = index === activeIndex;
            return (
              <motion.div
                key={index}
                className="w-full shrink-0 flex justify-center"
                animate={{
                  scale: isActive ? 1.0 : 0.92,
                  opacity: isActive ? 1 : 0.35,
                  z: isActive ? 20 : 0
                }}
                transition={{
                  type: "spring",
                  stiffness: 140,
                  damping: 18
                }}
              >
                <EditorialSlide
                  card={card}
                  index={index}
                  isActive={isActive}
                  importantDates={importantDates}
                  statistics={statistics}
                  category={category}
                  slideCount={cards.length}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Pagination dots (with 44px touch targets) */}
      <div className="mt-8 flex items-center justify-center gap-1.5 h-11">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setActiveIndex(index);
              trackCarouselCardClicked(cards[index].title);
            }}
            className="group flex items-center justify-center w-8 h-8 rounded-full transition-all focus:outline-none"
            aria-label={`Go to chapter ${index + 1}`}
          >
            <span
              className={`h-2.5 rounded-full transition-all duration-500 ${
                activeIndex === index
                  ? "w-8 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]"
                  : "w-2.5 bg-neutral-700 group-hover:bg-neutral-500"
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
