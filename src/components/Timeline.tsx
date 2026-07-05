import TimelineCard from "@/components/TimelineCard";

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
  selectedItem?: TimelineItem | null;
  onSelect?: (item: TimelineItem) => void;
  onExplore?: (topic: string) => void;
};

export default function Timeline({ items, selectedItem, onSelect, onExplore }: Props) {
  return (
    <section className="py-12 md:py-16">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
            Timeline
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Chronology Milestones
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-neutral-400">
          Click any key moment along the timeline to read details on why it mattered and its long-term impacts.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {items.map((item, index) => {
          const isSelected = selectedItem?.title === item.title;
          return (
            <div key={`${item.year}-${item.title}`} className="relative pl-6 md:pl-8">
              {index < items.length - 1 && (
                <div className={`absolute left-[5px] top-4 h-[calc(100%+1.5rem)] w-[2px] transition-all duration-500 ${
                  isSelected 
                    ? "bg-gradient-to-b from-cyan-400 via-cyan-500/30 to-white/5" 
                    : "bg-white/10"
                }`} />
              )}
              
              {/* Dynamic timeline node dot indicator */}
              <div className={`absolute left-[1px] top-6 h-[10px] w-[10px] rounded-full border transition-all duration-300 ${
                isSelected
                  ? "border-cyan-400 bg-cyan-400 shadow-[0_0_10px_#00f5a0] scale-125"
                  : "border-white/20 bg-[#0a0a0c] hover:border-cyan-400"
              }`} />
              
              <div className="ml-2">
                <TimelineCard 
                  item={item} 
                  isSelected={isSelected}
                  onSelect={() => onSelect?.(item)} 
                />
              </div>
            </div>
          );
        })}
      </div>

      {onExplore && (
        <div className="mt-8 flex justify-start">
          <button
            type="button"
            onClick={() => onExplore("History")}
            className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-neutral-300 transition-all duration-300 hover:border-cyan-400/50 hover:text-white hover:shadow-[0_0_20px_rgba(0,245,160,0.05)]"
          >
            Explore related history
          </button>
        </div>
      )}
    </section>
  );
}
