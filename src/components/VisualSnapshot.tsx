"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Globe, Users, Coins, MapPin, Film, BookOpen, Cpu, Sparkles, User, Calendar, Award } from "lucide-react";

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

interface TimelineMilestone {
  year: string;
  event: string;
}

type Props = {
  category: string;
  facts: StructuredFacts;
  timeline: TimelineMilestone[] | null;
  thumbnail: string | null;
};

export default function VisualSnapshot({ category, facts, timeline, thumbnail }: Props) {
  const catLower = category.toLowerCase();

  // 1. COUNTRY/GEOPOLITICAL SNAPSHOT
  const isCountry = catLower.includes("country") || catLower.includes("city") || catLower.includes("region") || catLower.includes("landmark");
  const countryMetrics = useMemo(() => {
    if (!isCountry) return null;

    let population = "10M+";
    let gdp = "N/A";
    let capital = facts.locations[0] || "Capital City";

    // Scan stats list for matching terms
    facts.statistics.forEach((stat) => {
      if (stat.toLowerCase().includes("population") || stat.toLowerCase().includes("million") || stat.toLowerCase().includes("billion")) {
        if (!stat.toLowerCase().includes("usd") && !stat.toLowerCase().includes("gdp") && !stat.toLowerCase().includes("$")) {
          population = stat;
        } else {
          gdp = stat;
        }
      } else if (stat.toLowerCase().includes("gdp") || stat.toLowerCase().includes("usd") || stat.toLowerCase().includes("$")) {
        gdp = stat;
      }
    });

    return { population, gdp, capital, flag: "🏳️" };
  }, [isCountry, facts]);

  // 2. MOVIE / BOOK SNAPSHOT
  const isCreative = catLower.includes("movie") || catLower.includes("tv series") || catLower.includes("book") || catLower.includes("video game") || catLower.includes("artwork");
  const creativeMetrics = useMemo(() => {
    if (!isCreative) return null;

    const authorOrCast = facts.keyPeople.slice(0, 4);
    const studioOrPublisher = facts.organizations[0] || "Publisher/Studio";
    const releaseDate = facts.importantDates[0] || "Release Date";
    const boxOfficeOrStats = facts.statistics[0] || "N/A";

    return { authorOrCast, studioOrPublisher, releaseDate, boxOfficeOrStats };
  }, [isCreative, facts]);

  // 3. TECHNOLOGY SNAPSHOT
  const isTech = catLower.includes("technology") || catLower.includes("programming language") || catLower.includes("operating system");
  const techMetrics = useMemo(() => {
    if (!isTech) return null;

    const inventor = facts.keyPeople[0] || facts.organizations[0] || "Inventor/Creator";
    const launchYear = facts.importantDates[0] || "N/A";
    const applications = facts.relatedArticles.slice(0, 4);

    return { inventor, launchYear, applications };
  }, [isTech, facts]);

  // 4. HISTORY / EMPIRE SNAPSHOT
  const isHistory = catLower.includes("event") || catLower.includes("empire") || catLower.includes("war") || catLower.includes("battle") || catLower.includes("history");

  // RENDER SECTIONS
  if (isCountry && countryMetrics) {
    return (
      <section className="py-12 border-t border-white/5 animate-fade-in-up">
        <div className="flex flex-col gap-2 mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
            Geopolitical index
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Visual Snapshot
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <div className="premium-card p-6 flex flex-col justify-between min-h-[160px] hover:border-cyan-500/30">
            <Globe className="h-6 w-6 text-cyan-400 opacity-80" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Capital</p>
              <h3 className="text-xl font-bold text-white truncate">{countryMetrics.capital}</h3>
            </div>
          </div>

          <div className="premium-card p-6 flex flex-col justify-between min-h-[160px] hover:border-cyan-500/30">
            <Users className="h-6 w-6 text-purple-400 opacity-80" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Population</p>
              <h3 className="text-lg font-bold text-white line-clamp-2 leading-snug">{countryMetrics.population}</h3>
            </div>
          </div>

          <div className="premium-card p-6 flex flex-col justify-between min-h-[160px] hover:border-cyan-500/30">
            <Coins className="h-6 w-6 text-emerald-400 opacity-80" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">GDP / Economy</p>
              <h3 className="text-lg font-bold text-white line-clamp-2 leading-snug">{countryMetrics.gdp}</h3>
            </div>
          </div>

          <div className="premium-card p-6 flex flex-col justify-between min-h-[160px] hover:border-cyan-500/30">
            <MapPin className="h-6 w-6 text-cyan-400 opacity-80" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Region Map</p>
              <h3 className="text-xl font-bold text-white truncate">{facts.locations[0] || "Global"}</h3>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isCreative && creativeMetrics) {
    return (
      <section className="py-12 border-t border-white/5 animate-fade-in-up">
        <div className="flex flex-col gap-2 mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
            Creative Portfolio
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Visual Snapshot
          </h2>
        </div>

        <div className="premium-card p-8 flex flex-col md:flex-row gap-8 items-center md:items-start hover:border-cyan-500/20">
          {thumbnail ? (
            <div className="w-48 h-64 shrink-0 rounded-2xl overflow-hidden border border-white/5 bg-neutral-900 shadow-2xl relative">
              <img src={thumbnail} alt={facts.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="w-48 h-64 shrink-0 rounded-2xl border border-white/5 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center shadow-2xl">
              {catLower.includes("book") ? (
                <BookOpen className="h-16 w-16 text-cyan-500/30" />
              ) : (
                <Film className="h-16 w-16 text-cyan-500/30" />
              )}
            </div>
          )}

          <div className="flex-grow space-y-6 text-center md:text-left w-full">
            <div>
              <h3 className="text-2xl font-bold text-white">{facts.title}</h3>
              <p className="text-xs text-neutral-400 mt-1 font-light italic">{facts.subtitle || "Creative Masterwork"}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border-l border-white/10 pl-4 py-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Release Date</span>
                <span className="text-sm font-semibold text-cyan-400">{creativeMetrics.releaseDate}</span>
              </div>
              <div className="border-l border-white/10 pl-4 py-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Publisher/Studio</span>
                <span className="text-sm font-semibold text-neutral-200 line-clamp-1">{creativeMetrics.studioOrPublisher}</span>
              </div>
              <div className="border-l border-white/10 pl-4 py-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Reception/Sales</span>
                <span className="text-sm font-semibold text-neutral-200 line-clamp-1">{creativeMetrics.boxOfficeOrStats}</span>
              </div>
            </div>

            <div>
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2">Key Cast & Figures</span>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {creativeMetrics.authorOrCast.map((person, i) => (
                  <span key={i} className="px-3 py-1 text-xs font-light text-neutral-300 rounded-full bg-white/[0.03] border border-white/5 flex items-center gap-1.5">
                    <User className="h-3 w-3 text-cyan-400/60" /> {person}
                  </span>
                ))}
                {creativeMetrics.authorOrCast.length === 0 && (
                  <span className="text-xs text-neutral-500">Not specified</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isTech && techMetrics) {
    return (
      <section className="py-12 border-t border-white/5 animate-fade-in-up">
        <div className="flex flex-col gap-2 mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
            System Specifications
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Visual Snapshot
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="premium-card p-6.5 flex flex-col justify-between min-h-[180px] hover:border-cyan-500/20">
            <Cpu className="h-6 w-6 text-cyan-400" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Inventor / Organization</p>
              <h3 className="text-lg font-bold text-white line-clamp-2">{techMetrics.inventor}</h3>
            </div>
          </div>

          <div className="premium-card p-6.5 flex flex-col justify-between min-h-[180px] hover:border-cyan-500/20">
            <Calendar className="h-6 w-6 text-purple-400" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Launch Year</p>
              <h3 className="text-xl font-bold text-white">{techMetrics.launchYear}</h3>
            </div>
          </div>

          <div className="premium-card p-6.5 flex flex-col justify-between min-h-[180px] hover:border-cyan-500/20">
            <Sparkles className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Applications</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {techMetrics.applications.slice(0, 3).map((app, idx) => (
                  <span key={idx} className="px-2 py-0.5 text-[10px] bg-white/[0.03] border border-white/5 rounded text-neutral-300 truncate max-w-full">
                    {app}
                  </span>
                ))}
                {techMetrics.applications.length === 0 && (
                  <span className="text-xs text-neutral-500">Universal compute</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isHistory && timeline && timeline.length > 0) {
    return (
      <section className="py-12 border-t border-white/5 animate-fade-in-up">
        <div className="flex flex-col gap-2 mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
            Historical milestones
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Visual Snapshot
          </h2>
        </div>

        {/* Elegant Timeline Vertical layout with dynamic animation lines */}
        <div className="premium-card p-8 md:p-10 hover:border-cyan-500/10">
          <div className="relative border-l border-white/10 ml-4 md:ml-6 pl-8 space-y-10 my-4">
            {timeline.slice(0, 5).map((milestone, index) => (
              <div key={index} className="relative group/time">
                {/* Custom dot indicator */}
                <div className="absolute -left-[39px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-cyan-400 bg-neutral-950 group-hover/time:bg-cyan-400 transition-colors duration-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]" />
                
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                  <span className="text-base font-bold text-cyan-400 font-mono tracking-wider min-w-[90px]">
                    {milestone.year}
                  </span>
                  <p className="text-sm text-neutral-300 font-light group-hover/time:text-white transition-colors duration-300 leading-relaxed max-w-xl">
                    {milestone.event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // DEFAULT / CONCEPTUAL DIAGRAM FLOW
  const mainNode = facts.title;
  const nodes = useMemo(() => {
    return facts.relatedArticles.slice(0, 4);
  }, [facts.relatedArticles]);

  return (
    <section className="py-12 border-t border-white/5 animate-fade-in-up">
      <div className="flex flex-col gap-2 mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
          Conceptual architecture
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Visual Snapshot
        </h2>
      </div>

      <div className="premium-card p-8 flex flex-col items-center justify-center min-h-[340px] hover:border-cyan-500/10 overflow-hidden relative">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
          {/* Main Node */}
          <div className="px-6 py-3 rounded-full border border-cyan-400/30 bg-cyan-950/20 backdrop-blur shadow-[0_0_30px_rgba(6,182,212,0.1)] text-center max-w-[280px]">
            <span className="text-xs uppercase font-bold tracking-widest text-cyan-400 block mb-0.5">Focus</span>
            <h3 className="text-sm font-bold text-white truncate">{mainNode}</h3>
          </div>

          {/* Central Connecting Lines */}
          <div className="h-10 w-0.5 bg-gradient-to-b from-cyan-400/35 to-purple-400/20" />

          {/* Connected Children Rows */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 w-full">
            {nodes.map((node, i) => (
              <div key={i} className="flex flex-col items-center">
                {/* Horizontal / Diagonal connection stems */}
                <div className="h-6 w-px bg-purple-500/20" />
                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:border-purple-400/20 hover:bg-white/[0.03] transition-all duration-300 text-center w-full min-h-[85px] flex items-center justify-center">
                  <p className="text-xs text-neutral-300 font-light line-clamp-3 leading-snug">{node}</p>
                </div>
              </div>
            ))}
            {nodes.length === 0 && (
              <div className="col-span-4 text-center py-4">
                <p className="text-xs text-neutral-500 font-light">Explore connected concepts below in the Knowledge Trail.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
