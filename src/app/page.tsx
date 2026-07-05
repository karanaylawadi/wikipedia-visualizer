"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import { trackSearch, trackTopicOpened } from "@/lib/gtag";

export default function Home() {
  const [topic, setTopic] = useState("");
  const router = useRouter();

  function handleSearch() {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) return;

    trackSearch(trimmedTopic);
    trackTopicOpened(trimmedTopic);
    router.push(`/results?topic=${encodeURIComponent(trimmedTopic)}`);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col items-center justify-center text-center">
        <h1 className="text-5xl font-bold tracking-[0.02em] sm:text-6xl md:text-8xl">
          Wiki Visualizer
        </h1>

        <div className="mt-10 w-full max-w-2xl">
          <SearchBar
            topic={topic}
            setTopic={setTopic}
            loading={false}
            onAnalyze={handleSearch}
          />
        </div>
      </section>
    </main>
  );
}