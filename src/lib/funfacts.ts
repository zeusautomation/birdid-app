/**
 * Fun facts extraction — Wikipedia only, no LLM calls, no API keys.
 */

const INTERESTING_KEYWORDS = [
  "largest",
  "smallest",
  "only",
  "first",
  "unique",
  "known for",
  "famous",
  "species",
  "world",
  "record",
  "remarkable",
  "unusual",
  "can",
  "year",
  "century",
  "discovered",
  "despite",
  "however",
  "unlike",
  "surprisingly",
  "never",
  "always",
  "ancient",
  "endangered",
];

/**
 * Extract interesting sentences from Wikipedia article text.
 * Heuristic: sentences containing keywords that tend to signal interesting facts.
 */
export function extractFunFacts(text: string, commonName?: string): string[] {
  if (!text || text.trim().length === 0) {
    return commonName
      ? [`The ${commonName} is a fascinating bird species with unique adaptations.`]
      : [];
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 220);

  const facts: string[] = [];

  // First pass: pick sentences with interesting keywords
  for (const s of sentences) {
    if (facts.length >= 5) break;
    const lower = s.toLowerCase();
    if (INTERESTING_KEYWORDS.some((kw) => lower.includes(kw))) {
      facts.push(s.endsWith(".") || s.endsWith("!") || s.endsWith("?") ? s : s + ".");
    }
  }

  // Second pass: fill remaining slots from first sentences
  for (const s of sentences) {
    if (facts.length >= 4) break;
    const normalized = s.endsWith(".") || s.endsWith("!") || s.endsWith("?") ? s : s + ".";
    if (!facts.includes(normalized)) {
      facts.push(normalized);
    }
  }

  if (facts.length === 0 && commonName) {
    facts.push(`The ${commonName} is a fascinating bird species with unique adaptations.`);
  }

  return facts.slice(0, 4);
}

/**
 * Public interface matching the original signature for compatibility.
 * generateFunFacts is now synchronous-compatible (returns a Promise for API compatibility).
 */
export async function generateFunFacts(
  commonName: string,
  _scientificName: string,
  wikiExtract: string
): Promise<string[]> {
  return extractFunFacts(wikiExtract, commonName);
}
