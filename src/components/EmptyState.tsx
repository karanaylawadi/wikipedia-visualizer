export default function EmptyState() {
  const examples = [
    "Dubai",
    "Napoleon Bonaparte",
    "Roman Empire",
    "Artificial Intelligence",
    "Taj Mahal",
    "Chess",
  ];

  return (
    <section className="border-b border-neutral-200 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
        Start Exploring
      </p>

      <h2 className="mt-3 text-5xl font-bold">Search any Wikipedia topic.</h2>

      <p className="mt-5 max-w-2xl text-xl leading-8 text-neutral-600">
        Explore people, places, events, inventions, countries, ideas and history
        through a clean visual reading experience.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {examples.map((item) => (
          <span key={item} className="border border-neutral-300 px-4 py-2">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}