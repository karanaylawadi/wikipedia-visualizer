"use client";

interface Milestone {
  year: string;
  event: string;
}

type Props = {
  timeline: Milestone[] | null;
};

export default function Timeline({ timeline }: Props) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <section className="py-8 border-t border-white/5 mt-10 animate-fade-in-up">
      <div className="flex flex-col gap-2 mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
          Chronology
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Historical Timeline
        </h2>
      </div>

      <div className="relative border-l border-white/10 ml-4 md:ml-6 pl-6 space-y-8 my-6">
        {timeline.map((milestone, index) => (
          <div key={index} className="relative group">
            {/* Timeline bullet indicator dot */}
            <div className="absolute -left-[31px] top-1.5 h-[13px] w-[13px] rounded-full border-2 border-cyan-400 bg-black group-hover:bg-cyan-400 transition-colors duration-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
            
            <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6">
              <span className="text-base font-bold text-cyan-400 font-mono tracking-wider min-w-[90px]">
                {milestone.year}
              </span>
              <p className="text-sm text-neutral-200 font-light group-hover:text-white transition-colors duration-300">
                {milestone.event}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
