import type { RelatedArticle } from "@/types/wiki";

export default function RelatedArticles({
  articles,
  onSelect,
}: {
  articles: RelatedArticle[];
  onSelect: (title: string) => void;
}) {
  if (articles.length === 0) return null;

  return (
    <section className="py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
        Related Reading
      </p>

      <h2 className="mt-3 text-5xl font-bold">Continue Exploring</h2>

      <div className="mt-10 divide-y divide-neutral-200">
        {articles.map((article) => (
          <button
            key={article.title}
            onClick={() => onSelect(article.title)}
            className="grid w-full gap-8 py-8 text-left transition hover:bg-neutral-50 md:grid-cols-[140px_1fr_auto]"
          >
            {article.thumbnail?.source ? (
              <img
                src={article.thumbnail.source}
                alt={article.title}
                className="h-32 w-32 object-cover grayscale"
              />
            ) : (
              <div className="h-32 w-32 border border-neutral-200" />
            )}

            <div>
              <h3 className="text-3xl font-bold">{article.title}</h3>

              {article.description && (
                <p className="mt-3 max-w-2xl text-xl capitalize text-neutral-600">
                  {article.description}
                </p>
              )}
            </div>

            <span className="hidden self-center text-lg font-semibold md:block">
              Explore →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}