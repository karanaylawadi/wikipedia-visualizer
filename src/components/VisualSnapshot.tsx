"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  
  // V14 Ontology Fields
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
    ? ["Scientific Concept", "Mathematical Concept", "Medical Condition", "Animal"].includes(entityType)
    : catLower.includes("concept") || catLower.includes("scientific") || catLower.includes("chemical") || catLower.includes("element") || catLower.includes("disease") || catLower.includes("medicine") || catLower.includes("planet") || catLower.includes("star");
    
  const isCompany = entityType 
    ? ["Company", "Brand", "Organization"].includes(entityType)
    : catLower.includes("company") || catLower.includes("brand") || catLower.includes("corporation");

  const isPerson = entityType
    ? ["Person", "Musical Artist"].includes(entityType)
    : catLower.includes("person") || catLower.includes("artist") || catLower.includes("biography") || catLower.includes("physicist");

  // Interactive tab state
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    if (isHistory) setActiveTab("milestones");
    else if (isCountry) setActiveTab("demographics");
    else if (isTech) setActiveTab("architecture");
    else if (isCreative) setActiveTab("story");
    else if (isScience) setActiveTab("theory");
    else if (isCompany) setActiveTab("corporate");
    else if (isPerson) setActiveTab("bio");
  }, [category, facts]);

  // ==========================================
  // MODULE DATA DEFINITIONS
  // ==========================================
  const historyModule = useMemo(() => {
    const commanders = facts.historyData?.importantPeople || facts.keyPeople.slice(0, 3);
    const factions = facts.historyData?.causes || facts.organizations.slice(0, 3);
    const keyTheatres = facts.historyData?.geography || facts.locations.slice(0, 3);
    const timelineData = facts.historyData?.timeline || timeline || [];
    return { commanders, factions, keyTheatres, timelineData };
  }, [facts, timeline]);

  const countryModule = useMemo(() => {
    const capital = facts.countryData?.capital || facts.locations[0] || "Capital City";
    const region = facts.countryData?.mapLocation || facts.locations[1] || "Continental Area";
    const bordering = facts.countryData?.bordering || facts.locations.slice(2, 5);
    const population = facts.countryData?.population || "Estimated 10M+";
    const gdp = facts.countryData?.gdp || "Varies regionally";
    return { population, gdp, capital, region, bordering };
  }, [facts]);

  const techModule = useMemo(() => {
    const inventor = facts.technologyData?.inventor || facts.keyPeople[0] || "Key Pioneers";
    const launchYear = facts.technologyData?.launchYear || facts.importantDates[0] || "N/A";
    const keyInventions = facts.technologyData?.architecture || facts.relatedArticles.slice(0, 4);
    const applications = facts.technologyData?.evolution || facts.categories.slice(0, 4);
    return { inventor, launchYear, keyInventions, applications };
  }, [facts]);

  const creativeModule = useMemo(() => {
    const cast = facts.movieData?.cast || facts.bookData?.themes || facts.keyPeople.slice(0, 4);
    const publisher = facts.movieData?.producer || facts.bookData?.publisher || facts.organizations[0] || "Production Affiliate";
    const release = facts.movieData?.releaseDate || facts.bookData?.releaseDate || facts.importantDates[0] || "N/A";
    const boxOffice = facts.movieData?.boxOffice || facts.bookData?.pages || "N/A";
    const awards = facts.movieData?.awards || "Recognized / Nominated";
    const themes = facts.movieData?.themes || [];
    const plot = facts.movieData?.plot || facts.bookData?.plotSummary || facts.subtitle || "";
    return { cast, publisher, release, boxOffice, awards, themes, plot };
  }, [facts]);

  const scienceModule = useMemo(() => {
    const keyScientists = facts.scienceData?.discoverer ? [facts.scienceData.discoverer] : facts.keyPeople.slice(0, 3);
    const formula = facts.scienceData?.formula || "Theoretical Principles";
    const relationships = facts.scienceData?.applications || facts.relatedArticles.slice(0, 4);
    const discovery = facts.scienceData?.discovery || "N/A";
    return { keyScientists, formula, relationships, discovery };
  }, [facts]);

  const companyModule = useMemo(() => {
    const founders = facts.companyData?.founder ? [facts.companyData.founder] : facts.keyPeople.slice(1, 4);
    const ceo = facts.companyData?.leadership?.[0] || facts.keyPeople[0] || "Chief Executive";
    const revenue = facts.companyData?.revenue || "N/A";
    const marketCap = facts.companyData?.competitors?.[0] ? `Competes with ${facts.companyData.competitors[0]}` : "Enterprise Tier";
    const products = facts.companyData?.products || [];
    return { founders, ceo, revenue, marketCap, products };
  }, [facts]);

  const personModule = useMemo(() => {
    const data = facts.personData || {};
    const birth = data.birth || "Unknown";
    const death = data.death || "Present / Active";
    const occupation = data.occupation || "Notable Individual";
    const majorWorks = data.majorWorks || facts.relatedArticles.slice(0, 3);
    const legacy = data.legacy || [];
    return { birth, death, occupation, majorWorks, legacy };
  }, [facts]);

  // Tab configurations
  const tabs = useMemo(() => {
    if (isHistory) {
      return [
        { id: "milestones", label: "Operational Milestones", icon: Compass },
        { id: "figures", label: "Core Figures & Factions", icon: Users },
        { id: "theatres", label: "Campaign Theatres", icon: Globe }
      ];
    }
    if (isCountry) {
      return [
        { id: "demographics", label: "Demographics & Capital", icon: Building },
        { id: "economy", label: "Nominal GDP & Growth", icon: Coins },
        { id: "bordering", label: "Atlas & Boundaries", icon: MapPin }
      ];
    }
    if (isTech) {
      return [
        { id: "architecture", label: "Architecture Nodes", icon: Cpu },
        { id: "roadmap", label: "Invention Roadmap", icon: Calendar },
        { id: "adoption", label: "Ecosystem Spheres", icon: Sparkles }
      ];
    }
    if (isCreative) {
      return [
        { id: "story", label: "Story plot & themes", icon: Film },
        { id: "cast", label: "Creative Crew", icon: User },
        { id: "reception", label: "Awards & reviews", icon: Trophy }
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
    if (isPerson) {
      return [
        { id: "bio", label: "Biography Lifespan", icon: User },
        { id: "works", label: "Notable Contributions", icon: BookOpen },
        { id: "legacy", label: "Lifetime Legacy", icon: Trophy }
      ];
    }
    return [];
  }, [isHistory, isCountry, isTech, isCreative, isScience, isCompany, isPerson]);

  const activeTabDetails = tabs.find(t => t.id === activeTab);

  return (
    <div className="w-full py-16 md:py-24 border-b border-white/5">
      <div className="flex flex-col gap-2 mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
          Documentary Explorer
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Visual Explorer
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-stretch w-full">
        {/* LEFT TAB NAVIGATION SIDEBAR */}
        <div className="flex flex-row md:flex-col md:w-64 gap-2.5 overflow-x-auto md:overflow-x-visible shrink-0 pb-3 md:pb-0">
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
        <div className="flex-grow min-h-[300px] border border-white/5 bg-[#07080c]/50 rounded-2xl p-8 relative flex flex-col justify-between">
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

              {/* History Tabs */}
              {activeTab === "milestones" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Operational Milestones</h3>
                  <div className="relative pl-4 border-l border-white/10 flex flex-col gap-4 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {historyModule.timelineData.map((m: any, idx: number) => (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-cyan-500" />
                        <span className="text-[9px] font-mono text-cyan-400 font-bold block">{m.year}</span>
                        <p className="text-xs text-neutral-300 font-medium leading-normal mt-0.5">{m.event}</p>
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
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2">Generals / Commanders</span>
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
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2">Causes & Factions</span>
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

              {/* Country Tabs */}
              {activeTab === "demographics" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Demographics & Capital</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Administrative Capital</span>
                      <span className="text-base font-bold text-cyan-400">{countryModule.capital}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Population Census</span>
                      <span className="text-base font-bold text-neutral-200">{countryModule.population}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "economy" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Nominal GDP & Growth</h3>
                  <div className="premium-card p-4 border border-white/5 bg-white/[0.01]">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Nominal GDP Tier</span>
                    <span className="text-xl font-extrabold text-emerald-400">{countryModule.gdp}</span>
                  </div>
                </div>
              )}

              {activeTab === "bordering" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Atlas & Boundaries</h3>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2">Neighbouring Boundaries</span>
                  <div className="flex flex-wrap gap-2">
                    {countryModule.bordering.map((b: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.03] px-3 py-1 rounded-md border border-white/5 text-neutral-300">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tech Tabs */}
              {activeTab === "architecture" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Architecture Nodes</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Inventor / Creator</span>
                      <span className="text-xs font-semibold text-neutral-200">{techModule.inventor}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">First Launch</span>
                      <span className="text-xs font-semibold text-cyan-400">{techModule.launchYear}</span>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2">Technical Design Pillars</span>
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
                  <div className="flex gap-2">
                    <span className="text-xs font-semibold text-cyan-400">Launch Epoch:</span>
                    <span className="text-xs text-neutral-300">{techModule.launchYear}</span>
                  </div>
                </div>
              )}

              {activeTab === "adoption" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Ecosystem Spheres</h3>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2">Primary Use Cases</span>
                  <div className="flex flex-wrap gap-2">
                    {techModule.applications.map((app: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.03] px-3 py-1 rounded-md border border-white/5 text-neutral-300">
                        {app}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Creative Tabs */}
              {activeTab === "story" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Narrative Core</h3>
                  <p className="text-xs text-neutral-300 leading-relaxed font-serif italic mb-6">"{creativeModule.plot}"</p>
                  {creativeModule.themes.length > 0 && (
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2">Key Motifs</span>
                      <div className="flex flex-wrap gap-2">
                        {creativeModule.themes.map((t: string, idx: number) => (
                          <span key={idx} className="text-xs bg-white/[0.03] px-3 py-1 rounded-md border border-white/5 text-neutral-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "cast" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Creative Crew & Cast</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Director / Author</span>
                      <span className="text-xs font-semibold text-neutral-200">{creativeModule.publisher}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Main Cast / Figures</span>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {creativeModule.cast.map((item: string, idx: number) => (
                          <span key={idx} className="text-xs text-neutral-300">{item}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "reception" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Awards & Critical Reception</h3>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-0.5">Laurels / Footprint</span>
                      <span className="text-xs font-semibold text-neutral-200">{creativeModule.awards}</span>
                    </div>
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
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Discoverer / Pioneer</span>
                      <span className="text-xs font-semibold text-neutral-200">{scienceModule.keyScientists.join(", ") || "Researchers"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Discovery Date</span>
                      <span className="text-xs font-semibold text-cyan-400">{scienceModule.discovery}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "applications" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Real-world Uses</h3>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2">Modern Applications</span>
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
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Founders</span>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {companyModule.founders.map((f: string, idx: number) => (
                          <span key={idx} className="text-xs text-neutral-300">{f}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Active Executive</span>
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
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Latest Revenue</span>
                      <span className="text-base font-extrabold text-emerald-400">{companyModule.revenue}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Competitors / Cap</span>
                      <span className="text-xs font-semibold text-neutral-400">{companyModule.marketCap}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "products" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Product Ecosystem</h3>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2">Core Products & Offerings</span>
                  <div className="flex flex-wrap gap-2">
                    {companyModule.products.map((p: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.03] px-3 py-1 rounded-md border border-white/5 text-neutral-300">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Person Tabs */}
              {activeTab === "bio" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Biographical Lifespan</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Lifespan</span>
                      <span className="text-base font-bold text-neutral-200">{personModule.birth} — {personModule.death}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Primary Occupation</span>
                      <span className="text-base font-bold text-cyan-400">{personModule.occupation}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "works" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Notable Contributions</h3>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-2">Key Creations</span>
                  <div className="flex flex-wrap gap-2">
                    {personModule.majorWorks.map((work: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/[0.03] px-3 py-1 rounded-md border border-white/5 text-neutral-300">
                        {work}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "legacy" && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Lifetime Legacy</h3>
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
