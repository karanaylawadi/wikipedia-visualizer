"use client";

import { useState } from "react";

type Props = {
  title: string;
  imageUrl?: string | null;
};

export default function HeroImage({ title, imageUrl }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [prevUrl, setPrevUrl] = useState<string | null | undefined>(imageUrl);

  if (imageUrl !== prevUrl) {
    setPrevUrl(imageUrl);
    setLoaded(false);
  }

  if (!imageUrl) {
    return (
      <div className="relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/5 bg-gradient-to-br from-neutral-950 via-[#0a0a0c] to-neutral-900 p-8 text-center md:h-full">
        {/* Abstract Glowing shapes */}
        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-violet-600/10 blur-[50px]" />
        <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-cyan-600/10 blur-[50px]" />
        <div className="relative z-10 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/5 bg-white/[0.02] text-neutral-500">
            👁️
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-neutral-500">
            No portrait available on Wikipedia for <span className="text-neutral-300 font-semibold">{title}</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#0a0a0d] shadow-2xl transition duration-500 hover:border-white/10 md:h-full">
      {!loaded && (
        <div className="absolute inset-0 z-20 animate-pulse bg-neutral-900/80 backdrop-blur-sm" />
      )}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#030303]/90 via-black/20 to-transparent" />
      
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full min-h-[320px] w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03] md:h-full ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Subtle bottom tag */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-300 backdrop-blur-md border border-white/5">
        <span>Wikipedia Portrait</span>
      </div>
    </div>
  );
}
