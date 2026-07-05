"use client";

import { useState } from "react";

type Props = {
  topic: string;
  setTopic: (value: string) => void;
  loading: boolean;
  onAnalyze: () => void;
};

export default function SearchBar({
  topic,
  setTopic,
  loading,
  onAnalyze,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={`relative rounded-full p-[1px] transition-all duration-500 ${
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
          onChange={(event) => setTopic(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onAnalyze();
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search any Wikipedia subject..."
          className="flex-1 bg-transparent px-1 py-1.5 text-base text-white outline-none placeholder:text-neutral-500 sm:text-lg"
        />

        <button
          type="button"
          onClick={onAnalyze}
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
  );
}