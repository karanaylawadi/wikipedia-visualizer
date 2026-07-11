// Single source of truth for the app's curated topic list. Previously
// duplicated between src/app/page.tsx's `suggestions` array and
// SearchBar.tsx's `TRENDING_TOPICS` (docs/DECISIONS.md, Technical Debt #5).
// Also seeds the V19 Featured Articles page (src/app/featured/page.tsx).
export interface FeaturedTopic {
  name: string;
  description: string;
  emoji: string;
  category: string;
}

export const FEATURED_TOPICS: FeaturedTopic[] = [
  { name: "Space Race", description: "Cold War race to the stars", emoji: "🚀", category: "History" },
  { name: "Roman Empire", description: "From Republic to Fall", emoji: "🏛️", category: "History" },
  { name: "Renaissance Art", description: "Humanism and masterpieces", emoji: "🎨", category: "Art" },
  { name: "Quantum Computing", description: "Superposition and qubits", emoji: "💻", category: "Technology" },
  { name: "Napoleon Bonaparte", description: "Rise and fall of an empire", emoji: "⚔️", category: "History" },
  { name: "Taj Mahal", description: "Monuments of eternal love", emoji: "🕌", category: "History" },
];

export const TRENDING_TOPIC_NAMES = FEATURED_TOPICS.map((t) => t.name);
