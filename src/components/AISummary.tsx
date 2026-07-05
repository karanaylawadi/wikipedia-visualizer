type Props = {
  title: string;
  description: string;
  briefing: string;
};

export default function AISummary({ title, description, briefing }: Props) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-neutral-950/80 p-8 md:p-10">
      <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
        Editorial Brief
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-400">{description}</p>
      <p className="mt-6 max-w-3xl text-xl leading-9 text-neutral-200">{briefing}</p>
    </section>
  );
}
