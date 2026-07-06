import { NextResponse } from "next/server";
import { getAutocompleteSuggestions } from "@/lib/search/autocomplete";
import { rankSuggestions } from "@/lib/search/ranking";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";

  if (!query) {
    return NextResponse.json([]);
  }

  try {
    const rawSuggestions = await getAutocompleteSuggestions(query);
    const ranked = rankSuggestions(rawSuggestions, query);
    return NextResponse.json(ranked);
  } catch (error) {
    console.error("Autocomplete endpoint failed:", error);
    return NextResponse.json([]);
  }
}
