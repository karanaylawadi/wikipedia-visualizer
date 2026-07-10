"use client";

import { useState, useEffect, useRef, useMemo } from "react";

type Props = {
  topic: string;
  setTopic: (value: string) => void;
  loading: boolean;
  onAnalyze: (customTopic?: string) => void;
  currentGraphNeighbors?: string[];
};

interface AutocompleteItem {
  title: string;
  description: string;
  thumbnail: string | null;
  category: string;
}

const TRENDING_TOPICS = [
  "Space Race",
  "Roman Empire",
  "Napoleon Bonaparte",
  "Quantum Computing",
  "Renaissance Art",
  "Taj Mahal",
];

const BROWSE_CATEGORIES = [
  "History",
  "Science",
  "Art",
  "Technology",
  "Space",
  "Companies",
  "Books",
  "Movies",
];

export default function SearchBar({
  topic,
  setTopic,
  loading,
  onAnalyze,
  currentGraphNeighbors = [],
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [recents, setRecents] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("recent-searches");
      if (stored) {
        try {
          return JSON.parse(stored) as string[];
        } catch (e) {
          console.warn("Failed to parse recent searches", e);
        }
      }
    }
    return [];
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Save term to recents helper
  const addRecentSearch = (term: string) => {
    const list = [...recents];
    const filtered = [term, ...list.filter((t) => t !== term)].slice(0, 5);
    setRecents(filtered);
    localStorage.setItem("recent-searches", JSON.stringify(filtered));
  };

  // Debounced autocomplete fetch at 250ms with multi-signal ranking
  useEffect(() => {
    if (!topic.trim()) {
      return;
    }

    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(topic)}`);
        if (res.ok) {
          const data = (await res.json()) as AutocompleteItem[];
          
          // V17 Multi-signal ranking algorithm
          const ranked = [...data].sort((a, b) => {
            const aTitle = a.title.toLowerCase();
            const bTitle = b.title.toLowerCase();
            const q = topic.toLowerCase().trim();

            // 1. Exact match priority
            if (aTitle === q && bTitle !== q) return -1;
            if (bTitle === q && aTitle !== q) return 1;

            let aScore = 0;
            let bScore = 0;

            // Signal A: StartsWith match (highest priority keyword match)
            if (aTitle.startsWith(q)) aScore += 10;
            if (bTitle.startsWith(q)) bScore += 10;

            // Signal B: Current graph neighbors overlap
            if (currentGraphNeighbors.some(n => n.toLowerCase() === aTitle)) aScore += 5;
            if (currentGraphNeighbors.some(n => n.toLowerCase() === bTitle)) bScore += 5;

            // Signal C: Recent searches
            if (recents.some(r => r.toLowerCase() === aTitle)) aScore += 3;
            if (recents.some(r => r.toLowerCase() === bTitle)) bScore += 3;

            // Signal D: Trending topics
            if (TRENDING_TOPICS.some(t => t.toLowerCase() === aTitle)) aScore += 2;
            if (TRENDING_TOPICS.some(t => t.toLowerCase() === bTitle)) bScore += 2;

            if (aScore !== bScore) {
              return bScore - aScore; // Descending
            }

            return aTitle.localeCompare(bTitle);
          });

          setSuggestions(ranked);
        }
      } catch (err) {
        console.error("Failed to fetch autocomplete:", err);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [topic, currentGraphNeighbors, recents]);

  // Handle outside clicks to close overlay
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute list of currently focusable items for keyboard traversal
  const focusableItems = useMemo(() => {
    if (topic.trim().length > 0) {
      return suggestions.map((s) => ({ type: "autocomplete", value: s.title }));
    }
    return [
      ...TRENDING_TOPICS.map((t) => ({ type: "trending", value: t })),
      ...recents.map((r) => ({ type: "recent", value: r })),
      ...BROWSE_CATEGORIES.map((c) => ({ type: "category", value: c })),
    ];
  }, [topic, suggestions, recents]);

  // Keyboard navigation logic
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev < focusableItems.length - 1 ? prev + 1 : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : focusableItems.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < focusableItems.length) {
        const selected = focusableItems[activeIndex];
        if (selected.type === "category") {
          // Categories search
          setTopic(selected.value);
          setIsFocused(false);
          addRecentSearch(selected.value);
          onAnalyze(selected.value);
        } else {
          setTopic(selected.value);
          setIsFocused(false);
          addRecentSearch(selected.value);
          onAnalyze(selected.value);
        }
      } else {
        const finalTopic = topic.trim();
        if (finalTopic) {
          setIsFocused(false);
          addRecentSearch(finalTopic);
          onAnalyze();
        }
      }
    } else if (event.key === "Escape") {
      setIsFocused(false);
      containerRef.current?.querySelector("input")?.blur();
    }
  };

  const handleSelectSuggestion = (value: string) => {
    setTopic(value);
    setIsFocused(false);
    addRecentSearch(value);
    onAnalyze(value);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`relative rounded-full p-[1px] transition-all duration-500 z-50 ${
          isFocused
            ? "bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 shadow-[0_0_50px_rgba(0,245,160,0.25)] scale-[1.01]"
            : "bg-white/10 shadow-[0_0_30px_rgba(0,0,0,0.3)] hover:bg-white/20"
        }`}
      >
        <div className="flex items-center gap-3 rounded-full bg-[#0d0d11]/90 px-4 py-2.5 backdrop-blur-xl sm:px-6 sm:py-3.5">
          {/* Search Icon */}
          <svg
            className={`h-5 w-5 transition-colors duration-300 ${isFocused ? "text-cyan-400" : "text-neutral-500"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            type="text"
            value={topic}
            onChange={(event) => {
              const val = event.target.value;
              setTopic(val);
              if (!val.trim()) {
                setSuggestions([]);
              }
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              setActiveIndex(-1);
            }}
            placeholder="Search any Wikipedia subject..."
            className="flex-1 bg-transparent px-1 py-1.5 text-base text-white outline-none placeholder:text-neutral-500 sm:text-lg"
          />

          <button
            type="button"
            onClick={() => {
              const finalTopic = topic.trim();
              if (finalTopic) {
                addRecentSearch(finalTopic);
                onAnalyze();
              }
            }}
            disabled={loading}
            className="relative overflow-hidden rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 sm:px-6 sm:py-3"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-neutral-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exploring
              </span>
            ) : (
              "Explore"
            )}
          </button>
        </div>
      </div>

      {/* Autocomplete Overlay Suggestion Panel */}
      {isFocused && (
        <div className="absolute top-[calc(100%+12px)] left-0 w-full rounded-3xl border border-white/5 bg-[#0b0b0f]/95 p-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-40 overflow-hidden animate-fade-in-up">
          {/* Section 1: Empty Query - Instant Suggestion panel */}
          {!topic.trim() ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 text-left">
              {/* Trending Today */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-3.5">
                  Trending Today
                </h4>
                <div className="flex flex-col gap-1.5">
                  {TRENDING_TOPICS.map((term, i) => {
                    const absIndex = i;
                    const isActive = activeIndex === absIndex;
                    return (
                      <button
                        key={term}
                        onClick={() => handleSelectSuggestion(term)}
                        className={`text-sm text-left px-3 py-2 rounded-xl transition duration-200 truncate ${
                          isActive
                            ? "bg-white/10 text-white border border-white/5"
                            : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                        }`}
                      >
                        🔥 {term}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent Searches */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 mb-3.5">
                  Recent Searches
                </h4>
                {recents.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {recents.map((term, i) => {
                      const absIndex = TRENDING_TOPICS.length + i;
                      const isActive = activeIndex === absIndex;
                      return (
                        <button
                          key={term}
                          onClick={() => handleSelectSuggestion(term)}
                          className={`text-sm text-left px-3 py-2 rounded-xl transition duration-200 truncate ${
                            isActive
                              ? "bg-white/10 text-white border border-white/5"
                              : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                          }`}
                        >
                          ⏳ {term}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-600 px-3 py-2">
                    No recent searches.
                  </p>
                )}
              </div>

              {/* Browse Categories */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3.5">
                  Browse Categories
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {BROWSE_CATEGORIES.map((term, i) => {
                    const absIndex = TRENDING_TOPICS.length + recents.length + i;
                    const isActive = activeIndex === absIndex;
                    return (
                      <button
                        key={term}
                        onClick={() => handleSelectSuggestion(term)}
                        className={`text-xs text-left px-3 py-2.5 rounded-xl transition duration-200 border ${
                          isActive
                            ? "bg-white/10 text-white border-white/20"
                            : "border-white/5 text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                        }`}
                      >
                        📁 {term}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Section 2: Autocomplete suggestions list (with thumbnails) */
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  Suggestions ({suggestions.length})
                </span>
                <span className="text-[9px] text-neutral-600 font-mono">
                  Arrow keys to select
                </span>
              </div>

              {suggestions.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-2">
                  {suggestions.map((item, i) => {
                    const isActive = activeIndex === i;
                    return (
                      <div
                        key={item.title}
                        onClick={() => handleSelectSuggestion(item.title)}
                        className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-300 border text-left ${
                          isActive
                            ? "bg-gradient-to-r from-white/[0.08] to-transparent border-cyan-400/30"
                            : "border-transparent hover:bg-white/[0.03]"
                        }`}
                      >
                        {/* Suggestion thumbnail */}
                        <div className="h-11 w-11 rounded-lg overflow-hidden bg-neutral-900 shrink-0 flex items-center justify-center border border-white/5">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm text-neutral-600">✦</span>
                          )}
                        </div>

                        {/* Description metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-sm text-white truncate">
                              {item.title}
                            </span>
                            <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-neutral-400 border border-white/5 shrink-0">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>

                        <div className={`text-neutral-600 text-xs shrink-0 transition-transform duration-300 ${isActive ? "translate-x-1 text-cyan-400" : ""}`}>
                          →
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-neutral-500 animate-pulse">
                  Searching Wikipedia...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}