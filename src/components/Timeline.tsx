import TimelineCard, { TimelineCardItem } from "@/components/TimelineCard";

export type TimelineItem = {
  year: string;
  title: string;
  summary: string;
  significance?: string;
  whatHappened?: string;
  whyItMattered?: string;
  longTermImpact?: string;
  relatedPeople?: string[];
  relatedPlaces?: string[];
};

type Props = {
  items: TimelineItem[];
  onSelect?: (item: TimelineItem) => void;
  onExplore?: (topic: string) => void;
};

export default function Timeline({ items, onSelect, onExplore }: Props) {
  return (
    <section className="py-14 md:py-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
            Timeline
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            The Story Timeline
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-neutral-500">
          Follow the subject through the moments that shaped its story.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        {items.map((item, index) => (
          <div key={`${item.year}-${item.title}`} className="relative pl-6 md:pl-8">
            {index < items.length - 1 && (
              <div className="absolute left-[0.45rem] top-0 h-full w-px bg-gradient-to-b from-cyan-400/70 via-cyan-400/20 to-transparent" />
            )}
            <div className="absolute left-0 top-4 h-3 w-3 rounded-full border border-cyan-400/80 bg-cyan-400/20" />
            <div className="ml-2">
              <TimelineCard item={item} onSelect={() => onSelect?.(item)} />
            </div>
          </div>
        ))}
      </div>

      {onExplore && (
        <div className="mt-8 flex justify-start">
          <button
            type="button"
            onClick={() => onExplore("History")}
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-neutral-300 transition hover:border-cyan-400/50 hover:text-white"
          >
            Explore related history
          </button>
        </div>
      )}
    </section>
  );
}
