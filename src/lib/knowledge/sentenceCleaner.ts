// Replaces documentaryWriter.ts's old cleanFact(), which blindly sliced to
// 11 words regardless of grammar. The V17 forensic audit's clearest example:
// a Japan fact reading "...written using the kanji 日本 and is pronounced
// Nihon..." was cut to "...written using the kanji." — stopping one word
// before 日本, the actual fact the sentence exists to state
// (V17_FORENSIC_AUDIT.md, Bug #5).
//
// This module never cuts a sentence mid-clause. It always prefers a
// complete sentence over a short, broken one. If compression is needed, it
// only cuts at a real clause boundary (comma, semicolon, dash) and only
// when the resulting fragment doesn't end on a dangling word or strand a
// name/date/number/quoted term on the far side of the cut.

const DANGLING_END_WORDS = new Set([
  "a", "an", "the", "using", "with", "by", "of", "in", "on", "at", "to",
  "for", "and", "or", "but", "as", "is", "was", "were", "are", "his", "her",
  "its", "their", "that", "which", "who", "named", "called", "known",
]);

const CLAUSE_BOUNDARY = /,(?=\s)|;(?=\s)|\s+—\s+|\s+-\s+/g;

function endsOnDanglingWord(text: string): boolean {
  const words = text.trim().replace(/[.,;:!?]+$/, "").split(/\s+/);
  const last = words[words.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");
  return !!last && DANGLING_END_WORDS.has(last);
}

// Detects whether the text immediately after a candidate cut point starts
// with a quote, parenthetical, a non-Latin script run (e.g. kanji/kana/
// Cyrillic), or a digit — all signals that the material being cut off is
// exactly the kind of identifier that must never be dropped.
function strandsProtectedTerm(fullText: string, cutIndex: number): boolean {
  const tail = fullText.slice(cutIndex).replace(/^[,;\s—-]+/, "");
  if (!tail) return false;
  return /^["“'(]/.test(tail) || /^[Ѐ-ӿ一-鿿぀-ヿ]/.test(tail) || /^\d/.test(tail);
}

// Returns a clean, complete sentence built from the first sentence of
// `rawFact`. Prefers the whole sentence; only compresses at a clause
// boundary, and only when doing so is safe. Never returns a fragment that
// ends mid-thought.
export function cleanSentence(rawFact: string, maxWords = 24): string {
  if (!rawFact) return "";
  const stripped = rawFact.replace(/\[(Fact \d+|Cause|Effect|Takeaway)\]/gi, "").trim();
  if (!stripped) return "";

  const firstSentenceMatch = stripped.match(/^.*?[.!?](?=\s|$)/);
  const firstSentence = firstSentenceMatch ? firstSentenceMatch[0] : stripped;
  const candidate = firstSentence.replace(/[.!?]+$/, "").trim();
  if (!candidate) return "";

  const words = candidate.split(/\s+/);
  if (words.length <= maxWords) {
    return `${candidate}.`;
  }

  // Try clause boundaries from the last (longest safe prefix) backward.
  const boundaries: number[] = [];
  let match: RegExpExecArray | null;
  CLAUSE_BOUNDARY.lastIndex = 0;
  while ((match = CLAUSE_BOUNDARY.exec(candidate)) !== null) {
    boundaries.push(match.index);
  }

  for (let i = boundaries.length - 1; i >= 0; i--) {
    const cut = candidate.slice(0, boundaries[i]).trim();
    const cutWordCount = cut.split(/\s+/).length;
    if (cutWordCount < 5 || cutWordCount > maxWords) continue;
    if (endsOnDanglingWord(cut)) continue;
    if (strandsProtectedTerm(candidate, boundaries[i])) continue;
    return `${cut}.`;
  }

  // No safe compression point — keep the complete sentence rather than
  // mutilate it. Longer-but-whole beats short-but-broken.
  return `${candidate}.`;
}

// For short embedded phrases (e.g. a takeaway clause quoted inside another
// sentence) rather than a full standalone sentence. Same safety rules,
// tighter target, no forced trailing period.
export function cleanFragment(rawFact: string, maxWords = 12): string {
  return cleanSentence(rawFact, maxWords).replace(/\.$/, "");
}
