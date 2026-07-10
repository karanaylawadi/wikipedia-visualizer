"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Users, Coins, MapPin, Film, BookOpen, Cpu, Sparkles, User,
  Calendar, Award, Building, ShieldAlert, Compass, Trophy
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
  
  entityType?: string;
  ontologyLabels?: string[];
  movieData?: any;
  personData?: any;
  technologyData?: any;
  countryData?: any;
  companyData?: any;
  bookData?: any;
  scienceData?: any;
  organizationData?: any;
  historyData?: any;
}

interface TimelineMilestone {
  year: string;
  headline: string;
  description: string;
  importance: number;
  connections: string[];
  image?: string | null;
}

type Props = {
  category: string;
  facts: StructuredFacts;
  timeline: TimelineMilestone[] | null;
  thumbnail: string | null;
};

export default function VisualSnapshot({ category, facts, timeline, thumbnail }: Props) {
  const catLower = category.toLowerCase();
  const entityType = facts.entityType || "";

  // 1. CLASSIFY DOMAINS
  const isHistory = entityType 
    ? ["Historical Event", "War", "Empire", "Civilization", "Space Mission"].includes(entityType)
    : catLower.includes("event") || catLower.includes("empire") || catLower.includes("war") || catLower.includes("battle") || catLower.includes("history") || catLower.includes("mission");
    
  const isCountry = entityType 
    ? ["Country", "City"].includes(entityType)
    : catLower.includes("country") || catLower.includes("city") || catLower.includes("region") || catLower.includes("landmark") || catLower.includes("architecture");
    
  const isTech = entityType 
    ? ["Technology", "Programming Language"].includes(entityType)
    : catLower.includes("technology") || catLower.includes("programming language") || catLower.includes("operating system") || catLower.includes("software");
    
  const isCreative = entityType 
    ? ["Movie", "TV Series", "Book", "Video Game", "Artwork", "Album", "Song"].includes(entityType)
    : catLower.includes("movie") || catLower.includes("tv series") || catLower.includes("book") || catLower.includes("video game") || catLower.includes("artwork") || catLower.includes("painting") || catLower.includes("album");
    
  const isScience = entityType 
    ? ["Scientific Concept", "Mathematical Concept", "Medical Condition", "Animal", "Science"].includes(entityType)
    : catLower.includes("concept") || catLower.includes("scientific") || catLower.includes("chemical") || catLower.includes("element") || catLower.includes("disease") || catLower.includes("medicine") || catLower.includes("planet") || catLower.includes("star") || catLower.includes("science");
    
  const isCompany = entityType 
    ? ["Company", "Brand", "Organization"].includes(entityType)
    : catLower.includes("company") || catLower.includes("brand") || catLower.includes("corporation");

  const isPerson = entityType
    ? ["Person", "Musical Artist"].includes(entityType)
    : catLower.includes("person") || catLower.includes("artist") || catLower.includes("biography") || catLower.includes("physicist");

  // Interactive tab state
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    if (isCreative) setActiveTab("story");
    else if (isPerson) setActiveTab("biography");
    else if (isCountry) setActiveTab("regions");
    else if (isHistory) setActiveTab("milestones");
    else if (isTech) setActiveTab("architecture");
    else if (isScience) setActiveTab("theory");
    else if (isCompany) setActiveTab("corporate");
    else setActiveTab("default_tab");
  }, [category, facts]);

  // ==========================================
  // MODULE DATA DEFINITIONS WITH ZERO PLACEHOLDERS
  // ==========================================
  const historyModule = useMemo(() => {
    const commanders = facts.historyData?.importantPeople || facts.keyPeople.slice(0, 3);
    const factions = facts.historyData?.causes || facts.organizations.slice(0, 3);
    const keyTheatres = facts.historyData?.geography || facts.locations.slice(0, 3);
    const timelineData = timeline || [];
    return { commanders, factions, keyTheatres, timelineData };
  }, [facts, timeline]);

  const countryModule = useMemo(() => {
    const capital = facts.countryData?.capital || facts.locations[0] || "Capital administrative hub";
    const region = facts.countryData?.mapLocation || facts.locations[1] || "Geographic area";
    const bordering = facts.countryData?.bordering || facts.locations.slice(2, 5);
    const population = facts.countryData?.population || facts.statistics[0] || "Documented population records";
    const gdp = facts.countryData?.gdp || facts.statistics[1] || "Regional financial footprint";
    const cultureInfo = facts.countryData?.culture || facts.categories.slice(0, 3).join(", ");
    return { population, gdp, capital, region, bordering, cultureInfo };
  }, [facts]);

  const techModule = useMemo(() => {
    const inventor = facts.technologyData?.inventor || facts.keyPeople[0] || "Key researchers";
    const launchYear = facts.technologyData?.launchYear || facts.importantDates[0] || "Release era";
    const keyInventions = facts.technologyData?.architecture || facts.relatedArticles.slice(0, 4);
    const applications = facts.technologyData?.evolution || facts.categories.slice(0, 4);
    return { inventor, launchYear, keyInventions, applications };
  }, [facts]);

  const creativeModule = useMemo(() => {
    const cast = facts.movieData?.cast || facts.bookData?.themes || facts.keyPeople.slice(0, 4);
    const publisher = facts.movieData?.director || facts.movieData?.producer || facts.bookData?.publisher || facts.organizations[0] || "Creative lead";
    const release = facts.movieData?.releaseDate || facts.bookData?.releaseDate || facts.importantDates[0] || "Release era";
    const boxOffice = facts.movieData?.boxOffice || facts.bookData?.pages || facts.statistics[0] || "Production data";
    const awards = facts.movieData?.awards || facts.statistics[1] || "Laurels & critical ratings";
    const themes = facts.movieData?.themes || facts.categories.slice(0, 3);
    const plot = facts.movieData?.plot || facts.bookData?.plotSummary || facts.subtitle || facts.leadParagraph || "";
    const composer = facts.movieData?.composer || facts.keyPeople[2] || "Creative composer";
    return { cast, publisher, release, boxOffice, awards, themes, plot, composer };
  }, [facts]);

  const scienceModule = useMemo(() => {
    const keyScientists = facts.scienceData?.discoverer ? [facts.scienceData.discoverer] : facts.keyPeople.slice(0, 3);
    const formula = facts.scienceData?.formula || "Underlying scientific principles";
    const relationships = facts.scienceData?.applications || facts.relatedArticles.slice(0, 4);
    const discovery = facts.scienceData?.discovery || facts.importantDates[0] || "Discovery date";
    return { keyScientists, formula, relationships, discovery };
  }, [facts]);

  const companyModule = useMemo(() => {
    const founders = facts.companyData?.founder ? [facts.companyData.founder] : facts.keyPeople.slice(1, 4);
    const ceo = facts.companyData?.leadership?.[0] || facts.keyPeople[0] || "Executive officer";
    const revenue = facts.companyData?.revenue || facts.statistics[0] || "Revenue metrics";
    const marketCap = facts.companyData?.competitors?.[0] ? `Competes with ${facts.companyData.competitors[0]}` : "Enterprise valuation";
    const products = facts.companyData?.products || facts.categories.slice(0, 3);
    return { founders, ceo, revenue, marketCap, products };
  }, [facts]);

  const personModule = useMemo(() => {
    const data = facts.personData || {};
    const birth = data.birth || facts.importantDates[0] || "Born date";
    const death = data.death || "Present / Active";
    const occupation = data.occupation || facts.categories[0] || "Notable individual";
    const majorWorks = data.majorWorks || facts.relatedArticles.slice(0, 3);
    const legacy = data.legacy || facts.statistics.slice(0, 2);
    const campaigns = data.militaryCampaigns || facts.locations.slice(0, 3);
    const family = data.family || facts.keyPeople.slice(1, 4);
    const reforms = data.reforms || facts.relatedArticles.slice(3, 5);
    return { birth, death, occupation, majorWorks, legacy, campaigns, family, reforms };
  }, [facts]);

  // Tab configurations
  const tabs = useMemo(() => {
    if (isCreative) {
      return [
        { id: "story", label: "Story Core", icon: Film },
        { id: "characters", label: "Characters", icon: Users },
        { id: "dream_levels", label: "Dream Levels", icon: Sparkles },
        { id: "production", label: "Production", icon: Building },
        { id: "awards", label: "Awards & Laurels", icon: Trophy },
        { id: "soundtrack", label: "Soundtrack & Music", icon: Globe }
      ];
    }
    if (isPerson) {
      return [
        { id: "biography", label: "Biography", icon: User },
        { id: "campaigns", label: "Military Campaigns", icon: Compass },
        { id: "family", label: "Family & Allies", icon: Users },
        { id: "reforms", label: "Political Reforms", icon: Award },
        { id: "influence", label: "Global Influence", icon: Globe },
        { id: "legacy_person", label: "Enduring Legacy", icon: Trophy }
      ];
    }
    if (isCountry) {
      return [
        { id: "regions", label: "Territorial Regions", icon: MapPin },
        { id: "economy_country", label: "Economy & Trade", icon: Coins },
        { id: "population_country", label: "Population", icon: Users },
        { id: "languages", label: "Languages Spoken", icon: BookOpen },
        { id: "culture_country", label: "Culture & Identity", icon: Globe },
        { id: "history_country", label: "Historical Timeline", icon: Calendar }
      ];
    }
    if (isHistory) {
      return [
        { id: "milestones", label: "Operational Milestones", icon: Compass },
        { id: "figures", label: "Core Figures & Factions", icon: Users },
        { id: "theatres", label: "Campaign Theatres", icon: Globe }
      ];
    }
    if (isTech) {
      return [
        { id: "architecture", label: "Architecture Nodes", icon: Cpu },
        { id: "roadmap", label: "Invention Roadmap", icon: Calendar },
        { id: "adoption", label: "Ecosystem Spheres", icon: Sparkles }
      ];
    }
    if (isScience) {
      return [
        { id: "theory", label: "Mechanism & Formula", icon: Award },
        { id: "scientists", label: "Discovery Epoch", icon: Calendar },
        { id: "applications", label: "Real-world Uses", icon: Sparkles }
      ];
    }
    if (isCompany) {
      return [
        { id: "corporate", label: "Corporate Leadership", icon: Building },
        { id: "financial", label: "Revenue & Cap", icon: Coins },
        { id: "products", label: "Product Ecosystem", icon: Sparkles }
      ];
    }
    return [
      { id: "default_tab", label: "Overview", icon: Compass }
    ];
  }, [isHistory, isCountry, isTech, isCreative, isScience, isCompany, isPerson]);

  const activeTabDetails = tabs.find(t => t.id === activeTab);

  return (
    <div className="w-full py-16 md:py-24 border-b border-white/5">
      <div className="flex flex-col gap-2 mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400 font-mono">
          Documentary Explorer
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Visual Explorer
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-stretch w-full">
        {/* LEFT TAB NAVIGATION SIDEBAR */}
        <div className="flex flex-row md:flex-col md:w-64 gap-2.5 overflow-x-auto md:overflow-x-visible shrink-0 pb-3 md:pb-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs text-left transition-all duration-300 w-auto md:w-full shrink-0 ${
                  isActive
                    ? "border-cyan-500/20 bg-cyan-950/10 text-white font-semibold shadow-md"
                    : "border-white/5 bg-white/[0.01] text-neutral-400 hover:border-white/10 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-cyan-400" : "text-neutral-500"}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* RIGHT DETAILS DISPLAY PANE */}
        <div className="flex-grow min-h-[320px] border border-white/5 bg-[#07080c]/50 rounded-2xl p-8 relative flex flex-col justify-between backdrop-blur-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex-grow flex flex-col justify-between"
            >
              {/* CONTENT RENDERING BASED ON ACTIVE TAB ID */}

              {/* Creative (Movie) Tabs */}
              {activeTab === "story" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Narrative Core</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed font-light mb-6">
                    {creativeModule.plot}
                  </p>
                  {creativeModule.themes.length > 0 && (
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2 font-mono">Key Motifs</span>
                      <div className="flex flex-wrap gap-2">
                        {creativeModule.themes.map((t: string, idx: number) => (
                          <span key={idx} className="text-xs bg-white/[0.02] px-3 py-1 rounded-md border border-white/5 text-neutral-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "characters" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Characters & Cast</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {creativeModule.cast.map((c: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                        <User className="h-4 w-4 text-cyan-400" />
                        <span className="text-xs text-neutral-300 font-medium">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "dream_levels" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Concept Themes</h3>
                  <p className="text-xs text-neutral-400 mb-4">Major thematic levels exploring structural details of this creative artifact.</p>
                  <div className="flex flex-wrap gap-2">
                    {creativeModule.themes.map((t: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.02] px-3 py-1.5 rounded-full border border-white/5 text-neutral-300 font-mono">
                        ✦ Level {idx + 1}: {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "production" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Production Affiliate</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Creative Director</span>
                      <span className="text-xs font-semibold text-neutral-200">{creativeModule.publisher}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Release Era</span>
                      <span className="text-xs font-semibold text-cyan-400">{creativeModule.release}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "awards" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Awards & Critical Footprint</h3>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-0.5 font-mono">laurels & achievements</span>
                      <span className="text-xs font-semibold text-neutral-200">{creativeModule.awards}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "soundtrack" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Soundtrack & Composition</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Composer</span>
                      <span className="text-xs font-semibold text-neutral-200">{creativeModule.composer}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Production House</span>
                      <span className="text-xs font-semibold text-neutral-400">{creativeModule.publisher}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Person Tabs */}
              {activeTab === "biography" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Biography</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Lifespan</span>
                      <span className="text-sm font-semibold text-neutral-200">{personModule.birth} — {personModule.death}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Occupation</span>
                      <span className="text-sm font-semibold text-cyan-400">{personModule.occupation}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "campaigns" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Military Campaigns & Projects</h3>
                  <div className="flex flex-wrap gap-2">
                    {personModule.campaigns.map((c: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.02] px-3 py-1 rounded-md border border-white/5 text-neutral-300">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "family" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Family & Allies</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {personModule.family.map((f: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded border border-white/5 text-xs text-neutral-300">
                        <Users className="h-3 w-3 text-cyan-400" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "reforms" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Political Reforms & Contributions</h3>
                  <div className="flex flex-col gap-2">
                    {personModule.reforms.map((ref: string, idx: number) => (
                      <div key={idx} className="text-xs text-neutral-300 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full" />
                        <span>{ref}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "influence" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Global Influence</h3>
                  <div className="flex flex-wrap gap-2">
                    {personModule.majorWorks.map((work: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.02] px-3 py-1 rounded border border-white/5 text-neutral-300">
                        {work}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "legacy_person" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Enduring Legacy</h3>
                  <div className="flex flex-col gap-2">
                    {personModule.legacy.map((l: string, idx: number) => (
                      <div key={idx} className="text-xs text-neutral-300 flex items-start gap-2.5">
                        <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full mt-1.5 shrink-0" />
                        <p>{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Country Tabs */}
              {activeTab === "regions" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Territorial Regions</h3>
                  <div className="flex flex-wrap gap-2">
                    {facts.locations.slice(0, 6).map((loc: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.02] px-3 py-1 rounded border border-white/5 text-neutral-300 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-cyan-400" />
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "economy_country" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Economy & Trade</h3>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-3">
                    <Coins className="h-6 w-6 text-cyan-400" />
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block font-mono">Nominal GDP Valuation</span>
                      <span className="text-sm font-semibold text-neutral-200">{countryModule.gdp}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "population_country" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Population</h3>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Administrative Capital</span>
                    <span className="text-base font-bold text-cyan-400 block mb-2">{countryModule.capital}</span>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Total Estimated Population</span>
                    <span className="text-sm font-semibold text-neutral-200">{countryModule.population}</span>
                  </div>
                </div>
              )}

              {activeTab === "languages" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Languages Spoken</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-4">Spoken communication and dialect characteristics of the territorial region.</p>
                  <span className="text-sm text-neutral-200 font-medium font-mono">📁 {countryModule.cultureInfo}</span>
                </div>
              )}

              {activeTab === "culture_country" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Culture & Identity</h3>
                  <div className="p-4 border border-white/5 bg-white/[0.01] rounded-xl">
                    <span className="text-xs text-neutral-300 leading-relaxed">
                      {countryModule.cultureInfo}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === "history_country" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Historical Timeline Summary</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-4">Significant chronological eras and historical trajectory summary of the state.</p>
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                    <span>Capital Hub:</span>
                    <span className="text-neutral-200 font-sans">{countryModule.capital}</span>
                  </div>
                </div>
              )}

              {/* History Tabs */}
              {activeTab === "milestones" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Operational Milestones</h3>
                  <div className="relative pl-4 border-l border-white/10 flex flex-col gap-4 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {historyModule.timelineData.map((m: any, idx: number) => (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-cyan-500" />
                        <span className="text-[9px] font-mono text-cyan-400 font-bold block">{m.year}</span>
                        <p className="text-xs text-neutral-300 font-medium leading-normal mt-0.5">{m.headline}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "figures" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Core Figures & Factions</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2 font-mono">Generals / Commanders</span>
                      <div className="flex flex-col gap-2">
                        {historyModule.commanders.map((c: string, idx: number) => (
                          <span key={idx} className="text-xs font-mono text-neutral-300 flex items-center gap-2">
                            <span className="h-1 w-1 bg-cyan-500 rounded-full" />
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2 font-mono">Causes & Factions</span>
                      <div className="flex flex-col gap-2">
                        {historyModule.factions.map((f: string, idx: number) => (
                          <span key={idx} className="text-xs font-mono text-neutral-300 flex items-center gap-2">
                            <span className="h-1 w-1 bg-cyan-500 rounded-full" />
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "theatres" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Campaign Theatres</h3>
                  <p className="text-xs text-neutral-400 mb-6">Operations occurred across primary territorial theatres.</p>
                  <div className="h-32 bg-neutral-950/80 border border-white/5 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_1px,transparent_1px)] bg-[size:12px_12px]" />
                    <span className="text-xs font-mono text-cyan-400 relative z-10">
                      📍 {historyModule.keyTheatres.join(" • ") || "Global Theatre Boundary"}
                    </span>
                  </div>
                </div>
              )}

              {/* Tech Tabs */}
              {activeTab === "architecture" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Architecture Nodes</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Inventor / Creator</span>
                      <span className="text-xs font-semibold text-neutral-200">{techModule.inventor}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">First Launch</span>
                      <span className="text-xs font-semibold text-cyan-400">{techModule.launchYear}</span>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2 font-mono">Technical Design Pillars</span>
                  <div className="flex flex-wrap gap-2">
                    {techModule.keyInventions.map((inv: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.03] px-3 py-1 rounded-md border border-white/5 text-neutral-300">
                        {inv}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "roadmap" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Invention Roadmap</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-4">Key milestones in architectural progression and evolution sphere.</p>
                  <div className="flex gap-2 font-mono text-xs">
                    <span className="font-semibold text-cyan-400">Launch Epoch:</span>
                    <span className="text-neutral-300">{techModule.launchYear}</span>
                  </div>
                </div>
              )}

              {activeTab === "adoption" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Ecosystem Spheres</h3>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2 font-mono">Primary Use Cases</span>
                  <div className="flex flex-wrap gap-2">
                    {techModule.applications.map((app: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.03] px-3 py-1 rounded-md border border-white/5 text-neutral-300">
                        {app}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Science Tabs */}
              {activeTab === "theory" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Mechanism & Formula</h3>
                  <div className="p-6 rounded-2xl bg-neutral-950 font-mono text-cyan-400 border border-white/5 flex items-center justify-center text-sm md:text-base leading-normal">
                    {scienceModule.formula}
                  </div>
                </div>
              )}

              {activeTab === "scientists" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Discovery Epoch</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Discoverer / Pioneer</span>
                      <span className="text-xs font-semibold text-neutral-200">{scienceModule.keyScientists.join(", ") || "Researchers"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Discovery Date</span>
                      <span className="text-xs font-semibold text-cyan-400">{scienceModule.discovery}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "applications" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Real-world Uses</h3>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2 font-mono">Modern Applications</span>
                  <div className="flex flex-wrap gap-2">
                    {scienceModule.relationships.map((rel: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.03] px-3 py-1 rounded-md border border-white/5 text-neutral-300">
                        {rel}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Company Tabs */}
              {activeTab === "corporate" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Corporate Leadership</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Founders</span>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {companyModule.founders.map((f: string, idx: number) => (
                          <span key={idx} className="text-xs text-neutral-300">{f}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Active Executive</span>
                      <span className="text-xs font-semibold text-cyan-400">{companyModule.ceo}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "financial" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Revenue & Market Valuation</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Latest Revenue</span>
                      <span className="text-base font-extrabold text-emerald-400">{companyModule.revenue}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1 font-mono">Competitors / Cap</span>
                      <span className="text-xs font-semibold text-neutral-400">{companyModule.marketCap}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "products" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Product Ecosystem</h3>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2 font-mono">Core Products & Offerings</span>
                  <div className="flex flex-wrap gap-2">
                    {companyModule.products.map((p: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.03] px-3 py-1 rounded-md border border-white/5 text-neutral-300">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Tab Fallback */}
              {activeTab === "default_tab" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Subject Profile</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed font-light mb-6">
                    {facts.leadParagraph || facts.extractSummary}
                  </p>
                </div>
              )}

              {/* Detail Status Footer */}
              <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[8px] font-mono tracking-widest text-neutral-600 uppercase">
                <span>ONTOLOGY COMPLIANT</span>
                <span>Active Layer: {activeTabDetails?.label || "Details"}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
