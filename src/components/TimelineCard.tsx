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
      className={`group relative w-full rounded-2xl border p-6 text-left transition-all duration-300 hover:scale-[1.01] ${
        isSelected
          ? "border-cyan-400/40 bg-gradient-to-br from-cyan-950/20 via-neutral-950/90 to-black shadow-[0_0_30px_rgba(0,245,160,0.08)]"
          : "border-white/5 bg-white/[0.02] hover:border-cyan-500/20 hover:bg-white/[0.04]"
      }`}
    >
      {/* Decorative active glow dot */}
      {isSelected && (
        <span className="absolute -left-[1px] top-1/2 h-8 w-[2px] -translate-y-1/2 rounded-r-full bg-cyan-400 shadow-[0_0_10px_#00f5a0]" />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
          isSelected 
            ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
            : "border-white/10 bg-white/[0.03] text-neutral-400 group-hover:border-cyan-500/30 group-hover:text-cyan-300"
        }`}>
          {item.year}
        </span>
      </div>

      <h3 className="mt-4 text-xl font-semibold tracking-tight text-white transition-colors duration-300 group-hover:text-cyan-200">
        {item.title}
      </h3>
      
      <p className="mt-3 text-sm leading-relaxed text-neutral-400 group-hover:text-neutral-300 transition-colors duration-300">
        {item.summary}
      </p>

      {item.significance && (
        <p className="mt-4 text-xs italic leading-relaxed text-neutral-500">
          {item.significance}
        </p>
      )}
    </button>
  );
}
