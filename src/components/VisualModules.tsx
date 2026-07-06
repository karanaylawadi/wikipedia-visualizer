"use client";

interface StructuredFacts {
  title: string;
  subtitle: string;
  leadParagraph: string;
  categories: string[];
  majorSections: string[];
  relatedArticles: string[];
  importantDates: string[];
  extractSummary: string;
  statistics: string[];
  keyPeople: string[];
  locations: string[];
  organizations: string[];
}

type Props = {
  category: string;
  facts: StructuredFacts;
};

export default function VisualModules({ category, facts }: Props) {
  const catLower = category.toLowerCase();

  // Helper to render simple details grids
  const renderMetadataGrid = (titleText: string, label: string, items: string[], icon: string) => {
    if (items.length === 0) return null;
    return (
      <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-6 backdrop-blur-md">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-4">
          {titleText}
        </h4>
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-base select-none">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{item}</p>
                <p className="text-[10px] text-neutral-500 font-light">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 1. Company or Brand module
  if (catLower.includes("company") || catLower.includes("brand")) {
    return (
      <section className="py-8 border-t border-white/5 animate-fade-in-up mt-10">
        <div className="flex flex-col gap-2 mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
            Corporate Profile
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Enterprise Intelligence
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderMetadataGrid("Leadership & Founders", "Executive Key Person", facts.keyPeople.slice(0, 3), "💼")}
          {renderMetadataGrid("Subsidiaries & Groups", "Organization Affiliate", facts.organizations.slice(0, 3), "🏢")}

          {/* Custom mock stats/revenue card */}
          <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-neutral-900/35 to-black p-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">
              Financial & Structural Metrics
            </h4>
            <div className="space-y-4">
              {facts.statistics.slice(0, 3).map((stat, i) => (
                <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs text-neutral-400">Stat Point {i + 1}</span>
                  <span className="text-sm font-bold text-white font-mono">{stat}</span>
                </div>
              ))}
              {facts.statistics.length === 0 && (
                <p className="text-xs text-neutral-500">No financial metrics available in article summary.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 2. Country or City module
  if (catLower.includes("country") || catLower.includes("city") || catLower.includes("region")) {
    return (
      <section className="py-8 border-t border-white/5 animate-fade-in-up mt-10">
        <div className="flex flex-col gap-2 mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
            Geography & Demographics
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Geopolitical Index
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderMetadataGrid("Key Jurisdictions", "Geographic location", facts.locations.slice(0, 4), "📍")}

          {/* Demographic Metrics Card */}
          <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-4">
              Key Metrics & Figures
            </h4>
            <div className="space-y-3.5">
              {facts.statistics.slice(0, 4).map((stat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-neutral-500 font-mono text-xs">0{i + 1}</span>
                  <p className="text-sm text-neutral-200 font-light">{stat}</p>
                </div>
              ))}
              {facts.statistics.length === 0 && (
                <p className="text-xs text-neutral-500">Demographic metrics not specified in article summary.</p>
              )}
            </div>
          </div>

          {/* Interactive Map Coordinates placeholder */}
          <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-neutral-900/35 to-black p-6 flex flex-col justify-between min-h-[200px]">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 mb-2">
                Coordinates Mapping
              </h4>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                Geographic coordinates resolved from historical boundaries.
              </p>
            </div>
            <div className="h-24 rounded-2xl bg-neutral-950 border border-white/5 flex items-center justify-center relative overflow-hidden">
              {/* Map grid pattern lines */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:16px_16px]" />
              <span className="text-cyan-400 text-xs font-mono tracking-wider relative z-10">
                🗺️ GPS Boundary Resolved
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 3. Movie, TV Series, or Book module
  if (catLower.includes("movie") || catLower.includes("tv series") || catLower.includes("book") || catLower.includes("video game")) {
    return (
      <section className="py-8 border-t border-white/5 animate-fade-in-up mt-10">
        <div className="flex flex-col gap-2 mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
            Production & Cast Credits
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Creative Intelligence
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderMetadataGrid("Key Cast / Major Entities", "Key Figure", facts.keyPeople.slice(0, 4), "🎭")}
          {renderMetadataGrid("Publishers & Studios", "Production Affiliate", facts.organizations.slice(0, 3), "🎬")}

          {/* Franchise Milestones/Runtime details */}
          <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-neutral-900/35 to-black p-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 mb-4">
              Releases & Awards Metrics
            </h4>
            <div className="space-y-3.5">
              {facts.statistics.slice(0, 4).map((stat, i) => (
                <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs text-neutral-400">Release Data {i + 1}</span>
                  <span className="text-sm font-semibold text-white font-mono">{stat}</span>
                </div>
              ))}
              {facts.statistics.length === 0 && (
                <p className="text-xs text-neutral-500">Box office or release metrics not specified.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 4. Historical Event, War, or Empire module
  if (catLower.includes("event") || catLower.includes("empire") || catLower.includes("war") || catLower.includes("battle")) {
    return (
      <section className="py-8 border-t border-white/5 animate-fade-in-up mt-10">
        <div className="flex flex-col gap-2 mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
            Actors & Operations
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Operational Outline
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderMetadataGrid("Commanders & Figures", "Leader Involved", facts.keyPeople.slice(0, 4), "👑")}
          {renderMetadataGrid("Combatant Factions", "Organization Involved", facts.organizations.slice(0, 3), "⚔️")}
          {renderMetadataGrid("Campaign Theatres", "Campaign Location", facts.locations.slice(0, 3), "🗺️")}
        </div>
      </section>
    );
  }

  // 5. Scientific Concept or Technology module
  if (catLower.includes("concept") || catLower.includes("technology") || catLower.includes("programming language") || catLower.includes("operating system")) {
    return (
      <section className="py-8 border-t border-white/5 animate-fade-in-up mt-10">
        <div className="flex flex-col gap-2 mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
            Technical Architecture
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Specification Grid
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderMetadataGrid("Key Researchers & Innovators", "Inventor/Scientist", facts.keyPeople.slice(0, 3), "🔬")}
          {renderMetadataGrid("Ecosystem Organizations", "Technical Affiliate", facts.organizations.slice(0, 3), "🛠️")}

          {/* Quantitative Specs */}
          <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-neutral-900/35 to-black p-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-4">
              Quantitative Metrics
            </h4>
            <div className="space-y-3.5">
              {facts.statistics.slice(0, 4).map((stat, i) => (
                <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs text-neutral-400">Spec Point {i + 1}</span>
                  <span className="text-sm font-semibold text-white font-mono">{stat}</span>
                </div>
              ))}
              {facts.statistics.length === 0 && (
                <p className="text-xs text-neutral-500">Quantitative metrics not specified.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default fallback module if no specialized category matches
  return null;
}
