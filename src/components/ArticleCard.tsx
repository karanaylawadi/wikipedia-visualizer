import type { WikiResult } from "@/types/wiki";

export default function ArticleCard({ result }: { result: WikiResult }) {
  return (
    <article className="border-b border-neutral-200 py-16">
      <div className="grid gap-14 md:grid-cols-[360px_1fr]">
        {result.thumbnail?.source && (
          <img
            src={result.thumbnail.source}
            alt={result.title}
            className="h-[420px] w-full object-cover grayscale"
          />
        )}

        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
            Wikipedia Article
          </p>

          <h2 className="mt-4 text-6xl font-bold tracking-tight">
            {result.title}
          </h2>

          {result.description && (
            <p className="mt-4 text-2xl capitalize text-neutral-600">
              {result.description}
            </p>
          )}

          <div className="mt-10 max-w-3xl border-y border-neutral-200 py-8">
            <p className="text-2xl leading-10 text-neutral-900">
              {result.extract}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-neutral-500">
            <span>Source · Wikipedia</span>
            <span>Language · {result.lang || "en"}</span>
            <span>
              Updated ·{" "}
              {result.timestamp
                ? new Date(result.timestamp).toLocaleDateString()
                : "Unknown"}
            </span>
          </div>

          {result.content_urls?.desktop?.page && (
            <a
              href={result.content_urls.desktop.page}
              target="_blank"
              className="mt-8 inline-block border-b border-black pb-1 text-lg font-semibold hover:text-neutral-600"
            >
              Read on Wikipedia →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}