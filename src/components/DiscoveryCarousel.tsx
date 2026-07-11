"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
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

  if (!topics || topics.length === 0) return null;

  const handleCardClick = (title: string) => {
    trackRelatedTopicClicked(title);
    router.push(`/results?topic=${encodeURIComponent(title)}`);
  };

  return (
    <section className="py-16 md:py-24 animate-fade-in-up">
      <div className="mb-10 px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
          Related Journeys
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Continue Learning
        </h2>
      </div>

      {/* Card grid — replaces the previous horizontal scroll-snap carousel
          per the V19 "Continue Learning" grid treatment. */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {topics.map((item) => {
          const categoryInitial = (item.category || "?").trim().charAt(0).toUpperCase() || "?";
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => handleCardClick(item.title)}
              className="group flex flex-col justify-between text-left border border-white/5 bg-[#07080c]/50 p-5 min-h-[380px] rounded-2xl hover:border-cyan-500/20 hover:bg-white/[0.01] transition-all duration-300"
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
                  {/* Category badge — single-letter initial, matching the
                      V19 mock's compact category indicator */}
                  <span className="absolute top-3 left-3 h-6 w-6 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-cyan-400 flex items-center justify-center">
                    {categoryInitial}
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
                <ArrowRight className="h-3.5 w-3.5 text-neutral-400 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all duration-300" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
