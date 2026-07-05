"use client";

import { useEffect, useState } from "react";

type Props = {
  title: string;
  imageUrl?: string | null;
};

export default function HeroImage({ title, imageUrl }: Props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-[2rem] border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black p-8 text-center text-neutral-400">
        <p className="max-w-sm text-lg leading-8">
          A visual portrait of {title} will appear here when Wikipedia provides one.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950 shadow-[0_0_80px_rgba(0,0,0,0.35)]">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-neutral-900/80 backdrop-blur-sm" />
      )}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-[320px] w-full object-cover transition duration-500 md:h-[420px] ${loaded ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
      />
    </div>
  );
}
