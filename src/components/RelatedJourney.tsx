"use client";

import { useRouter } from "next/navigation";

type Props = {
  currentTopic: string;
  relatedList: string[];
};

export default function RelatedJourney({ currentTopic, relatedList }: Props) {
  const router = useRouter();

  if (relatedList.length === 0) return null;

  return (
    <section className="py-8 border-t border-white/5 animate-fade-in-up mt-10">
      <div className="flex flex-col gap-2 mb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-400">
          Knowledge Trail
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Explore the Path
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-neutral-400 font-light">
          Deepen your understanding of {currentTopic} by following these conceptual paths.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        {relatedList.slice(0, 6).map((topic, index) => (
          <button
            key={topic}
            onClick={() => router.push(`/results?topic=${encodeURIComponent(topic)}`)}
            className="flex items-center gap-3 rounded-full border border-white/5 bg-white/[0.02] px-5 py-3.5 text-xs text-neutral-300 hover:border-violet-500/30 hover:bg-white/[0.04] hover:text-white transition duration-300"
          >
            <span className="h-5 w-5 rounded-full bg-violet-500/10 flex items-center justify-center font-bold text-[9px] text-violet-400 border border-violet-400/20 select-none">
              {index + 1}
            </span>
            <span className="font-medium">{topic}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
