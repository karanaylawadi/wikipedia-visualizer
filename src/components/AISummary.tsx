type Props = {
  title: string;
  description: string;
  briefing: string;
};

export default function AISummary({ title, description, briefing }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-gradient-to-br from-neutral-900/40 via-neutral-950/60 to-[#0c0c0f]/80 p-8 shadow-2xl backdrop-blur-xl md:p-10">
      {/* Decorative Glow inside Card */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-[40px] pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-violet-500/10 blur-[40px] pointer-events-none" />

      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-400">
        AI Editorial Brief
      </p>
      
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
        {title}
      </h2>
      
      {description && (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-400">
          {description}
        </p>
      )}
      
      <hr className="my-6 border-white/5" />
      
      <p className="max-w-3xl text-lg font-light leading-relaxed text-neutral-200 md:text-xl md:leading-loose line-clamp-[10] overflow-hidden">
        {briefing}
      </p>
    </section>
  );
}
