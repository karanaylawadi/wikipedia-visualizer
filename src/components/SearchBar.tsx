"use client";

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
  return (
    <div className="rounded-full p-[2px] animated-gradient shadow-[0_0_60px_rgba(0,217,245,0.18)]">
      <div className="flex items-center gap-3 rounded-full bg-black px-4 py-3 sm:px-6 sm:py-4">
        <input
          type="text"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onAnalyze();
          }}
          placeholder="Search Wikipedia..."
          className="flex-1 bg-transparent px-1 py-2 text-base text-white outline-none placeholder:text-neutral-500 sm:text-lg"
        />

        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading}
          className="rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400 sm:px-5 sm:py-3"
        >
          {loading ? "Exploring..." : "Explore"}
        </button>
      </div>
    </div>
  );
}