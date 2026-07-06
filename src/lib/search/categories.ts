export function resolveCategoryFromList(categories: string[], title: string): string {
  const text = `${title} ${categories.map((c) => c.replace(/^Category:/i, "")).join(" ")}`.toLowerCase();
  
  if (text.includes("film") || text.includes("movie") || text.includes("cinema")) return "Movie";
  if (text.includes("television") || text.includes("tv series") || text.includes("tv show")) return "TV Series";
  if (text.includes("novel") || text.includes("book") || text.includes("literature") || text.includes("novels")) return "Book";
  if (text.includes("singer") || text.includes("musician") || text.includes("band") || text.includes("album") || text.includes("song")) return "Music";
  if (text.includes("politician") || text.includes("president") || text.includes("governor")) return "Political Figure";
  if (text.includes("scientist") || text.includes("physicist") || text.includes("chemist") || text.includes("mathematician")) return "Scientist";
  if (text.includes("inventor") || text.includes("invention")) return "Inventor";
  if (text.includes("biography") || text.includes("born") || text.includes("died") || text.includes("people")) return "Person";
  if (text.includes("war") || text.includes("battle") || text.includes("conflict") || text.includes("treaty")) return "Historical Event";
  if (text.includes("city") || text.includes("capital")) return "City";
  if (text.includes("country") || text.includes("nation")) return "Country";
  if (text.includes("software") || text.includes("computing") || text.includes("programming")) return "Technology";
  if (text.includes("empire") || text.includes("dynasty") || text.includes("kingdom")) return "Historical Empire";
  if (text.includes("monument") || text.includes("temple") || text.includes("palace") || text.includes("castle")) return "Landmark";
  
  return "General";
}
