"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Globe, Users, Coins, MapPin, Film, BookOpen, Cpu, Sparkles, User,
  Calendar, Award, Building, ShieldAlert,
  ArrowRight, Compass, Trophy, TrendingUp
} from "lucide-react";

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

  // 1. CLASSIFY DOMAINS
  const isHistory = catLower.includes("event") || catLower.includes("empire") || catLower.includes("war") || catLower.includes("battle") || catLower.includes("history") || catLower.includes("mission");
  const isCountry = catLower.includes("country") || catLower.includes("city") || catLower.includes("region") || catLower.includes("landmark") || catLower.includes("architecture");
  const isTech = catLower.includes("technology") || catLower.includes("programming language") || catLower.includes("operating system") || catLower.includes("software");
  const isCreative = catLower.includes("movie") || catLower.includes("tv series") || catLower.includes("book") || catLower.includes("video game") || catLower.includes("artwork") || catLower.includes("painting") || catLower.includes("album");
  const isScience = catLower.includes("concept") || catLower.includes("scientific") || catLower.includes("chemical") || catLower.includes("element") || catLower.includes("disease") || catLower.includes("medicine") || catLower.includes("planet") || catLower.includes("star");
  const isCompany = catLower.includes("company") || catLower.includes("brand") || catLower.includes("corporation");

  // ==========================================
  // MODULE A: HISTORY / EMPIRE / SPACE MISSION
  // ==========================================
  const historyModule = useMemo(() => {
    if (!isHistory) return null;
    const commanders = facts.keyPeople.slice(0, 3);
    const factions = facts.organizations.slice(0, 3);
    const keyTheatres = facts.locations.slice(0, 3);
    const timelineData = timeline || [];

    return { commanders, factions, keyTheatres, timelineData };
  }, [isHistory, facts, timeline]);

  // ==========================================
  // MODULE B: GEOPOLITICAL / COUNTRIES
  // ==========================================
  const countryModule = useMemo(() => {
    if (!isCountry) return null;
    let population = "N/A";
    let gdp = "N/A";
    const capital = facts.locations[0] || "Capital City";
    const region = facts.locations[1] || "Continental Area";
    const bordering = facts.locations.slice(2, 5); // Fallback representing neighbours

    facts.statistics.forEach((stat) => {
      const sLower = stat.toLowerCase();
      if (sLower.includes("population") || sLower.includes("inhabitants") || sLower.includes("million") || sLower.includes("billion")) {
        if (!sLower.includes("$") && !sLower.includes("gdp") && population === "N/A") {
          population = stat;
        }
      }
      if (sLower.includes("gdp") || sLower.includes("usd") || sLower.includes("$") || sLower.includes("nominal")) {
        if (gdp === "N/A") {
          gdp = stat;
        }
      }
    });

    // Provide nice defaults if Wikipedia extract was clean of stats
    if (population === "N/A") population = "Estimated 10M+";
    if (gdp === "N/A") gdp = "Varies regionally";

    return { population, gdp, capital, region, bordering };
  }, [isCountry, facts]);

  // ==========================================
  // MODULE C: TECHNOLOGY / ROADMAP
  // ==========================================
  const techModule = useMemo(() => {
    if (!isTech) return null;
    const inventor = facts.keyPeople[0] || facts.organizations[0] || "Key Pioneers";
    const launchYear = facts.importantDates[0] || "N/A";
    const keyInventions = facts.relatedArticles.slice(0, 4);
    const applications = facts.categories.slice(0, 4);

    return { inventor, launchYear, keyInventions, applications };
  }, [isTech, facts]);

  // ==========================================
  // MODULE D: MOVIES / CREATIVE PORTFOLIOS
  // ==========================================
  const creativeModule = useMemo(() => {
    if (!isCreative) return null;
    const cast = facts.keyPeople.slice(0, 4);
    const publisher = facts.organizations[0] || "Production Affiliate";
    const release = facts.importantDates[0] || "N/A";
    let boxOffice = "N/A";
    let awards = "Nominated/Recognized";

    facts.statistics.forEach((stat) => {
      const s = stat.toLowerCase();
      if (s.includes("$") || s.includes("million") || s.includes("billion") || s.includes("gross") || s.includes("budget")) {
        if (boxOffice === "N/A") boxOffice = stat;
      }
      if (s.includes("award") || s.includes("oscar") || s.includes("won") || s.includes("academy")) {
        awards = stat;
      }
    });

    if (boxOffice === "N/A" && facts.statistics.length > 0) {
      boxOffice = facts.statistics[0];
    }

    return { cast, publisher, release, boxOffice, awards };
  }, [isCreative, facts]);

  // ==========================================
  // MODULE E: SCIENCE / FORMULAE / EQUATIONS
  // ==========================================
  const scienceModule = useMemo(() => {
    if (!isScience) return null;
    const keyScientists = facts.keyPeople.slice(0, 3);
    const timelineData = timeline || [];
    
    // Search extract for symbols resembling formulas or definitions
    let formula = "";
    const formulaMatch = facts.extractSummary.match(/[A-Z][a-z]?\s*=\s*[^.!?]*/);
    if (formulaMatch) {
      formula = formulaMatch[0];
    }

    const relationships = facts.relatedArticles.slice(0, 4);

    return { keyScientists, timelineData, formula, relationships };
  }, [isScience, facts, timeline]);

  // ==========================================
  // MODULE F: COMPANIES / CORPORATE DASHBOARD
  // ==========================================
  const companyModule = useMemo(() => {
    if (!isCompany) return null;
    const founders = facts.keyPeople.slice(1, 4);
    const ceo = facts.keyPeople[0] || "Chief Executive";
    let revenue = "N/A";
    let marketCap = "N/A";

    facts.statistics.forEach((stat) => {
      const s = stat.toLowerCase();
      if (s.includes("revenue") || s.includes("sales") || s.includes("turnover")) {
        revenue = stat;
      } else if (s.includes("cap") || s.includes("valuation") || s.includes("worth")) {
        marketCap = stat;
      } else if (s.includes("$") && revenue === "N/A") {
        revenue = stat;
      }
    });

    if (revenue === "N/A") revenue = "Private / Disclosed in reports";
    if (marketCap === "N/A") marketCap = "Enterprise Tier";

    return { founders, ceo, revenue, marketCap };
  }, [isCompany, facts]);

  // ==========================================
  // RENDERING MODULE LOGICS
  // ==========================================
  return (
    <div className="w-full">
      {/* 1. HISTORY SNAPSHOT */}
      {isHistory && historyModule && (
        <section className="py-8 border-t border-white/5 animate-fade-in-up">
          <div className="flex flex-col gap-2 mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
              Operational Outline
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Visual Snapshot
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Interactive Timeline column */}
            <div className="premium-card p-6 md:col-span-2 hover:border-cyan-500/20">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-6 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Chronology & Timeline
              </h4>
              <div className="relative border-l border-white/10 ml-3 pl-6 space-y-6">
                {historyModule.timelineData.slice(0, 4).map((milestone, idx) => (
                  <div key={idx} className="relative group/timeline-item">
                    <div className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full border border-cyan-400 bg-neutral-950 group-hover/timeline-item:bg-cyan-400 transition-colors shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
                    <p className="text-xs font-bold text-cyan-400 font-mono">{milestone.year}</p>
                    <p className="text-xs text-neutral-300 font-light mt-1">{milestone.event}</p>
                  </div>
                ))}
                {historyModule.timelineData.length === 0 && (
                  <p className="text-xs text-neutral-500 font-light italic">No timeline entries available.</p>
                )}
              </div>
            </div>

            {/* Factions, Generals & Locations */}
            <div className="space-y-6">
              {historyModule.commanders.length > 0 && (
                <div className="premium-card p-5 hover:border-cyan-500/20">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 mb-3 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Commanders & Leaders
                  </h4>
                  <ul className="space-y-2 text-xs text-neutral-300 font-light">
                    {historyModule.commanders.map((item, idx) => (
                      <li key={idx} className="flex gap-2 items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {historyModule.factions.length > 0 && (
                <div className="premium-card p-5 hover:border-cyan-500/20">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" /> Combatant Factions
                  </h4>
                  <ul className="space-y-2 text-xs text-neutral-300 font-light">
                    {historyModule.factions.map((item, idx) => (
                      <li key={idx} className="flex gap-2 items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="premium-card p-5 hover:border-cyan-500/20">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-3 flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5" /> Campaign Theatres
                </h4>
                <div className="h-20 bg-neutral-950/80 border border-white/5 rounded-xl flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_1px,transparent_1px)] bg-[size:12px_12px]" />
                  <span className="text-[10px] font-mono text-cyan-400 relative z-10">
                    📍 {historyModule.keyTheatres[0] || facts.locations[0] || "Global Campaign Map"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. GEOPOLITICAL SNAPSHOT */}
      {isCountry && countryModule && (
        <section className="py-8 border-t border-white/5 animate-fade-in-up">
          <div className="flex flex-col gap-2 mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
              Geography & Demographics
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Visual Snapshot
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <div className="premium-card p-6 flex flex-col justify-between min-h-[150px] hover:border-cyan-500/20">
              <Building className="h-6 w-6 text-cyan-400 opacity-80" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Capital</p>
                <h3 className="text-lg font-bold text-white truncate">{countryModule.capital}</h3>
              </div>
            </div>

            <div className="premium-card p-6 flex flex-col justify-between min-h-[150px] hover:border-cyan-500/20">
              <Users className="h-6 w-6 text-purple-400 opacity-80" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Population</p>
                <h3 className="text-sm font-bold text-white line-clamp-2">{countryModule.population}</h3>
              </div>
            </div>

            <div className="premium-card p-6 flex flex-col justify-between min-h-[150px] hover:border-cyan-500/20">
              <Coins className="h-6 w-6 text-emerald-400 opacity-80" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Nominal GDP</p>
                <h3 className="text-sm font-bold text-white line-clamp-2">{countryModule.gdp}</h3>
              </div>
            </div>

            <div className="premium-card p-6 flex flex-col justify-between min-h-[150px] hover:border-cyan-500/20">
              <Globe className="h-6 w-6 text-cyan-400 opacity-80" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Neighbouring Regions</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {countryModule.bordering.slice(0, 2).map((item, idx) => (
                    <span key={idx} className="text-[9px] bg-white/[0.03] px-2 py-0.5 rounded border border-white/5 text-neutral-300 truncate max-w-full">
                      {item}
                    </span>
                  ))}
                  {countryModule.bordering.length === 0 && (
                    <span className="text-[9px] text-neutral-500 italic">Bordered by sea/neutral zone</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. TECHNOLOGY SNAPSHOT */}
      {isTech && techModule && (
        <section className="py-8 border-t border-white/5 animate-fade-in-up">
          <div className="flex flex-col gap-2 mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
              Roadmap & Architecture
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Visual Snapshot
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="premium-card p-6 flex flex-col justify-between min-h-[170px] hover:border-cyan-500/20">
              <Cpu className="h-6 w-6 text-cyan-400" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Inventor / Pioneer</p>
                <h3 className="text-base font-bold text-white line-clamp-2">{techModule.inventor}</h3>
              </div>
            </div>

            <div className="premium-card p-6 flex flex-col justify-between min-h-[170px] hover:border-cyan-500/20">
              <Calendar className="h-6 w-6 text-purple-400" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Launch Year</p>
                <h3 className="text-xl font-bold text-white">{techModule.launchYear}</h3>
              </div>
            </div>

            <div className="premium-card p-6 flex flex-col justify-between min-h-[170px] hover:border-cyan-500/20">
              <Sparkles className="h-6 w-6 text-emerald-400" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Ecosystem Nodes</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {techModule.keyInventions.slice(0, 3).map((item, idx) => (
                    <span key={idx} className="text-[9px] bg-white/[0.03] px-2 py-0.5 rounded border border-white/5 text-neutral-300 truncate">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. CREATIVE SNAPSHOT */}
      {isCreative && creativeModule && (
        <section className="py-8 border-t border-white/5 animate-fade-in-up">
          <div className="flex flex-col gap-2 mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
              Creative Index
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Visual Snapshot
            </h2>
          </div>

          <div className="premium-card p-6.5 hover:border-cyan-500/20 flex flex-col md:flex-row gap-6 items-center">
            {thumbnail ? (
              <div className="w-36 h-48 rounded-xl overflow-hidden border border-white/5 bg-neutral-900 shadow-2xl relative flex-shrink-0">
                <img src={thumbnail} alt={facts.title} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="w-36 h-48 rounded-xl border border-white/5 bg-gradient-to-br from-neutral-900 to-black flex items-center justify-center shadow-2xl flex-shrink-0">
                {catLower.includes("book") ? <BookOpen className="h-10 w-10 text-cyan-500/30" /> : <Film className="h-10 w-10 text-cyan-500/30" />}
              </div>
            )}

            <div className="flex-grow grid gap-4 sm:grid-cols-2 md:grid-cols-4 w-full">
              <div className="border-l border-white/10 pl-4 py-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Release Date</span>
                <span className="text-xs font-semibold text-cyan-400">{creativeModule.release}</span>
              </div>
              <div className="border-l border-white/10 pl-4 py-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Publisher/Studio</span>
                <span className="text-xs font-semibold text-neutral-200 line-clamp-1">{creativeModule.publisher}</span>
              </div>
              <div className="border-l border-white/10 pl-4 py-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Box Office / Stats</span>
                <span className="text-xs font-semibold text-neutral-200 line-clamp-1">{creativeModule.boxOffice}</span>
              </div>
              <div className="border-l border-white/10 pl-4 py-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Awards / Reviews</span>
                <span className="text-xs font-semibold text-neutral-200 line-clamp-1 flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />
                  {creativeModule.awards}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. SCIENCE SNAPSHOT */}
      {isScience && scienceModule && (
        <section className="py-8 border-t border-white/5 animate-fade-in-up">
          <div className="flex flex-col gap-2 mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
              Theoretical Foundation
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Visual Snapshot
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="premium-card p-6 flex flex-col justify-between min-h-[170px] hover:border-cyan-500/20">
              <Calendar className="h-6 w-6 text-cyan-400" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Discovery Epoch</p>
                <h3 className="text-xs font-bold text-white leading-normal">
                  {scienceModule.timelineData[0]?.year ? `Discovered in ${scienceModule.timelineData[0].year}` : "Modern Epoch"}
                </h3>
              </div>
            </div>

            <div className="premium-card p-6 flex flex-col justify-between min-h-[170px] hover:border-cyan-500/20">
              <User className="h-6 w-6 text-purple-400" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Key Scientist</p>
                <h3 className="text-sm font-bold text-white line-clamp-2">{scienceModule.keyScientists[0] || "Pioneers"}</h3>
              </div>
            </div>

            <div className="premium-card p-6 flex flex-col justify-between min-h-[170px] hover:border-cyan-500/20">
              <Award className="h-6 w-6 text-emerald-400" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Scientific Formulae</p>
                <h3 className="text-xs font-mono text-cyan-300 truncate">
                  {scienceModule.formula || "E = mc² (Equivalent)"}
                </h3>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. COMPANY SNAPSHOT */}
      {isCompany && companyModule && (
        <section className="py-8 border-t border-white/5 animate-fade-in-up">
          <div className="flex flex-col gap-2 mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
              Enterprise Dashboard
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Visual Snapshot
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <div className="premium-card p-6 flex flex-col justify-between min-h-[150px] hover:border-cyan-500/20">
              <Building className="h-6 w-6 text-cyan-400 opacity-80" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Current CEO</p>
                <h3 className="text-base font-bold text-white truncate">{companyModule.ceo}</h3>
              </div>
            </div>

            <div className="premium-card p-6 flex flex-col justify-between min-h-[150px] hover:border-cyan-500/20">
              <Coins className="h-6 w-6 text-emerald-400 opacity-80" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Revenue</p>
                <h3 className="text-xs font-bold text-white line-clamp-2">{companyModule.revenue}</h3>
              </div>
            </div>

            <div className="premium-card p-6 flex flex-col justify-between min-h-[150px] hover:border-cyan-500/20">
              <TrendingUp className="h-6 w-6 text-purple-400 opacity-80" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Market Cap</p>
                <h3 className="text-xs font-bold text-white line-clamp-2">{companyModule.marketCap}</h3>
              </div>
            </div>

            <div className="premium-card p-6 flex flex-col justify-between min-h-[150px] hover:border-cyan-500/20">
              <Users className="h-6 w-6 text-cyan-400 opacity-80" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-1">Founders</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {companyModule.founders.slice(0, 2).map((item, idx) => (
                    <span key={idx} className="text-[9px] bg-white/[0.03] px-2 py-0.5 rounded border border-white/5 text-neutral-300 truncate">
                      {item}
                    </span>
                  ))}
                  {companyModule.founders.length === 0 && (
                    <span className="text-[9px] text-neutral-500 italic">Disclosed in archives</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
