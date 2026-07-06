import type { AutocompleteItem } from "./autocomplete";

export function rankSuggestions(
  items: AutocompleteItem[],
  query: string
): AutocompleteItem[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return items;

  return [...items].sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();

    // 1. Exact match priority
    if (aTitle === cleanQuery && bTitle !== cleanQuery) return -1;
    if (bTitle === cleanQuery && aTitle !== cleanQuery) return 1;

    // 2. StartsWith match priority
    if (aTitle.startsWith(cleanQuery) && !bTitle.startsWith(cleanQuery)) return -1;
    if (bTitle.startsWith(cleanQuery) && !aTitle.startsWith(cleanQuery)) return 1;

    // 3. Keep original ranking
    return 0;
  });
}
