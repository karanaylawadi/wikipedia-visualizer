"use client";

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

export default function PerspectiveGrid({ cards, category }: Props) {
  const handleCardClick = (card: PerspectiveCard) => {
    trackCarouselCardClicked(card.title);
  };

  const humanReadableCategory = (cat: string) => {
    if (!cat) return "Topic";
    return cat
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <section className="py-8">
      <div className="flex flex-col gap-2 mb-8 animate-fade-in-up">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
          {humanReadableCategory(category)} Perspectives
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Analysis Perspectives
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-neutral-400 mt-2 font-light">
          Five concise perspectives to help you understand the topic quickly.
        </p>
      </div>

      <div
        className="grid gap-6 animate-fade-in-up"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        {cards.map((card, index) => {
          return (
            <div
              key={index}
              onClick={() => handleCardClick(card)}
              className="group relative flex flex-col justify-between rounded-3xl border border-white/5 bg-gradient-to-br from-neutral-900/35 via-neutral-950/50 to-black p-6.5 shadow-xl transition-all duration-500 hover:border-cyan-500/20 hover:shadow-[0_0_40px_rgba(0,245,160,0.04)] cursor-pointer min-h-[300px]"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full bg-white/[0.03] border border-white/5 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.20em] text-neutral-400 group-hover:text-cyan-400 transition-colors duration-300">
                    {card.referenceLabel || `Perspective ${index + 1}`}
                  </span>
                </div>

                <h3 className="text-xl font-bold tracking-tight text-white transition-colors duration-300 group-hover:text-cyan-200">
                  {card.title}
                </h3>

                {card.readerQuestion && (
                  <p className="mt-2 text-xs font-medium text-neutral-400 italic">
                    {card.readerQuestion}
                  </p>
                )}

                <p className="mt-4 text-sm leading-relaxed text-neutral-300 font-light line-clamp-[7] overflow-hidden">
                  {card.summary}
                </p>
              </div>

              {card.keyTakeaway && (
                <div className="mt-6 pt-4 border-t border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Key Takeaway
                  </span>
                  <p className="text-xs italic text-cyan-400 font-light leading-relaxed line-clamp-2 overflow-hidden">
                    {card.keyTakeaway}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
