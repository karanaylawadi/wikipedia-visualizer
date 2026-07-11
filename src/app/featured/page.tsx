import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Featured Articles — Visualizer.wiki",
  description:
    "Browse Visualizer.wiki's canonical library of AI-synthesized editorial briefings, timelines, and connected knowledge for Wikipedia subjects.",
  alternates: {
    canonical: "/featured",
  },
};

interface FeaturedArticleEntry {
  title: string;
  summary: string;
  ontologyName: string;
  ontologyLabel: string;
}

// Server-rendered, reads the canonical knowledge/ store directly — the
// same artifacts src/app/api/analyze/route.ts serves, never a separately
// invented list. Only PASS/PARTIAL artifacts are shown; a FAIL-status
// artifact is excluded entirely rather than rendered with weak content,
// consistent with the trust architecture's "hide a module if valid
// content cannot be produced" rule (docs/NON_NEGOTIABLES.md).
function loadFeaturedArticles(): FeaturedArticleEntry[] {
  const baseDir = path.join(process.cwd(), "knowledge");
  if (!fs.existsSync(baseDir)) return [];

  const entries: FeaturedArticleEntry[] = [];
  const ontologyDirs = fs.readdirSync(baseDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const dir of ontologyDirs) {
    const dirPath = path.join(baseDir, dir.name);
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dirPath, file), "utf-8");
        const artifact = JSON.parse(raw);

        const status = artifact?.qualityAssessment?.status;
        if (status === "FAIL" || !status) continue;

        const title = artifact?.structuredFacts?.title;
        const summary = artifact?.structuredFacts?.briefSummary;
        if (!title || !summary) continue;

        entries.push({
          title,
          summary,
          ontologyName: artifact?.ontology?.name || "General",
          ontologyLabel: artifact?.ontology?.labels?.[0] || artifact?.ontology?.name || "General",
        });
      } catch {
        // Malformed or unreadable artifact — skip rather than render
        // broken content.
        continue;
      }
    }
  }

  return entries.sort((a, b) => a.title.localeCompare(b.title));
}

export default function FeaturedArticlesPage() {
  const articles = loadFeaturedArticles();

  return (
    <main className="relative min-h-screen bg-[#090A0F] px-4 py-6 text-white sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <div className="glow-cyan radial-glow absolute top-10 left-10 opacity-10 pointer-events-none" />
      <div className="glow-violet radial-glow absolute bottom-10 right-10 opacity-10 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <nav className="flex items-center justify-between border-b border-white/5 pb-5 mb-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 transition hover:text-white"
          >
            ← Home
          </Link>
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Visualizer.wiki
          </span>
        </nav>

        <section className="py-12 md:py-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400 font-mono">
            The Library
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            Featured Articles
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-400 font-light">
            A growing library of editorial briefings, generated from English Wikipedia and
            verified against Visualizer.wiki&apos;s trust checks before publication.
          </p>
        </section>

        {articles.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-500">
            No verified articles are available yet.
          </p>
        ) : (
          <section className="grid grid-cols-1 gap-6 pb-24 sm:grid-cols-2 md:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.title}
                href={`/results?topic=${encodeURIComponent(article.title)}`}
                className="group flex flex-col justify-between rounded-2xl border border-white/5 bg-[#07080c]/50 p-6 min-h-[220px] transition-all duration-300 hover:border-cyan-500/20 hover:bg-white/[0.01]"
              >
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/10 bg-cyan-950/10">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-cyan-400"
                        aria-hidden="true"
                      >
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                      {article.ontologyLabel}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white group-hover:text-cyan-300 transition duration-300 leading-snug line-clamp-2">
                    {article.title}
                  </h2>
                  <p className="mt-2.5 text-xs text-neutral-400 font-light line-clamp-3 leading-relaxed">
                    {article.summary}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 group-hover:text-cyan-400 transition-colors duration-300">
                  Read Briefing →
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
