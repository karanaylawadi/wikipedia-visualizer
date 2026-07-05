export default function Loading() {
  return (
    <div className="border-b border-neutral-300 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
        Loading
      </p>

      <h2 className="mt-3 text-4xl font-bold">Reading Wikipedia...</h2>

      <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
        Fetching the article, image, summary and connected references.
      </p>
    </div>
  );
}