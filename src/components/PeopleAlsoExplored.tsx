"use client";

import { useRouter } from "next/navigation";
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

export default function PeopleAlsoExplored({ topics }: Props) {
  const router = useRouter();

  if (!topics || topics.length === 0) return null;

  return (
    <section className="py-8 animate-fade-in-up">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">
        Discovery Hub
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
        People Also Explored
      </h2>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {topics.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => {
              trackRelatedTopicClicked(item.title);
              router.push(`/results?topic=${encodeURIComponent(item.title)}`);
            }}
            className="group relative flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-left transition-all duration-300 hover:border-cyan-400/30 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(0,245,160,0.05)] w-full"
          >
            {/* Sub-topic thumbnail */}
            <div className="h-14 w-14 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-white/5 flex items-center justify-center">
              {item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <span className="text-lg text-neutral-600">✦</span>
              )}
            </div>

            {/* Subject metadata */}
            <div className="flex-grow min-w-0">
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition duration-300 truncate">
                  {item.title}
                </h3>
              </div>
              <p className="rounded-full bg-white/[0.03] border border-white/5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-400 mt-1 max-w-max truncate">
                {item.category || "Topic"}
              </p>
              {item.description && (
                <p className="mt-1.5 text-xs text-neutral-500 line-clamp-1">
                  {item.description}
                </p>
              )}
            </div>

            <div className="text-neutral-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-sm shrink-0">
              →
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
