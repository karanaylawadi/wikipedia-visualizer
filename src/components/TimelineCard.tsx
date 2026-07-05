import { trackTimelineCardClicked } from "@/lib/gtag";

export type TimelineCardItem = {
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
  item: TimelineCardItem;
  onSelect?: (item: TimelineCardItem) => void;
  isSelected?: boolean;
};

export default function TimelineCard({ item, onSelect, isSelected }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.(item);
        trackTimelineCardClicked(item.title);
      }}
      className={`w-full rounded-[1.5rem] border p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-[0_0_44px_rgba(0,217,245,0.12)] ${
        isSelected
          ? "border-cyan-400/70 bg-cyan-400/10"
          : "border-white/10 bg-neutral-950/80"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-cyan-300">
          {item.year}
        </span>
      </div>

      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {item.title}
      </h3>
      <p className="mt-3 text-base leading-7 text-neutral-400">{item.summary}</p>

      {item.significance && (
        <p className="mt-4 text-sm leading-7 text-neutral-500">
          {item.significance}
        </p>
      )}
    </button>
  );
}
