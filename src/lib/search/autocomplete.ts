export interface AutocompleteItem {
  title: string;
  description: string;
  thumbnail: string | null;
  category: string;
}

export async function getAutocompleteSuggestions(query: string): Promise<AutocompleteItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    // 1. Fetch titles from Wikipedia OpenSearch API
    const openSearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=8&search=${encodeURIComponent(trimmed)}`;
    const openSearchRes = await fetch(openSearchUrl);
    if (!openSearchRes.ok) {
      return [];
    }

    const openSearchData = await openSearchRes.json() as unknown[];
    const titles = Array.isArray(openSearchData[1]) ? (openSearchData[1] as string[]) : [];
    if (titles.length === 0) {
      return [];
    }

    // 2. Batch fetch page details from Wikipedia query API
    const detailsUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|description|categories&titles=${encodeURIComponent(titles.join("|"))}&piprop=thumbnail&pithumbsize=100&origin=*`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) {
      return titles.map((title) => ({
        title,
        description: "Explore this subject",
        thumbnail: null,
        category: "Topic",
      }));
    }

    const detailsData = await detailsRes.json() as {
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            description?: string;
            thumbnail?: { source?: string };
            categories?: Array<{ title?: string }>;
          }
        >;
      };
    };
    const pages = detailsData.query?.pages || {};

    const pageMap = new Map<string, { description?: string; thumbnail?: string | null; category?: string }>();

    for (const key of Object.keys(pages)) {
      const page = pages[key];
      const title = String(page.title || "");
      const description = String(page.description || "");
      const thumbnail = page.thumbnail?.source || null;

      // Extract categories for heuristic category mapping
      const categories: string[] = Array.isArray(page.categories)
        ? page.categories.map((c) => String(c.title || "").toLowerCase())
        : [];
      let category = "Topic";

      const catText = categories.join(" ");
      if (catText.includes("film") || catText.includes("movie") || catText.includes("cinema")) {
        category = "Movie";
      } else if (catText.includes("novel") || catText.includes("book") || catText.includes("writer") || catText.includes("literature")) {
        category = "Book";
      } else if (catText.includes("people") || catText.includes("biography") || catText.includes("births") || catText.includes("deaths") || catText.includes("popes")) {
        category = "Person";
      } else if (catText.includes("city") || catText.includes("capitals") || catText.includes("settlements") || catText.includes("towns")) {
        category = "City";
      } else if (catText.includes("countries") || catText.includes("nations") || catText.includes("states")) {
        category = "Country";
      } else if (catText.includes("technology") || catText.includes("computing") || catText.includes("software") || catText.includes("internet")) {
        category = "Technology";
      } else if (catText.includes("landmark") || catText.includes("monuments") || catText.includes("buildings") || catText.includes("palaces")) {
        category = "Landmark";
      }

      pageMap.set(title, { description, thumbnail, category });
    }

    // Maintain OpenSearch order
    return titles.map((title) => {
      const details = pageMap.get(title) || {};
      return {
        title,
        description: details.description || "Explore this subject",
        thumbnail: details.thumbnail || null,
        category: details.category || "Topic",
      };
    });
  } catch (error) {
    console.error("Autocomplete failed:", error);
    return [];
  }
}
