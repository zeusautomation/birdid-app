export interface WikipediaResult {
  title: string;
  description: string;
  extract: string;
  thumbnail?: string;
}

export async function fetchWikipediaSummary(
  speciesName: string
): Promise<WikipediaResult | null> {
  const encoded = encodeURIComponent(speciesName.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BirdID-App/1.0 (bird identification tool)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    return {
      title: data.title ?? speciesName,
      description: data.description ?? "",
      extract: data.extract ?? "",
      thumbnail: data.thumbnail?.source ?? undefined,
    };
  } catch {
    return null;
  }
}

export interface ParsedBirdInfo {
  habitat: string;
  diet: string;
  behavior: string;
  range: string;
}

export function parseBirdInfoFromExtract(extract: string): ParsedBirdInfo {
  // Try to pull meaningful info from Wikipedia extract text
  const sentences = extract
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 20);

  const habitatKeywords = [
    "forest",
    "woodland",
    "grassland",
    "wetland",
    "marsh",
    "coast",
    "urban",
    "habitat",
    "lives in",
    "found in",
    "inhabit",
    "nests in",
    "nest",
  ];
  const dietKeywords = [
    "eats",
    "feeds",
    "diet",
    "insects",
    "seeds",
    "berries",
    "fish",
    "worms",
    "fruit",
    "nectar",
    "prey",
    "omnivore",
    "carnivore",
    "herbivore",
  ];
  const behaviorKeywords = [
    "migratory",
    "migrates",
    "social",
    "solitary",
    "nocturnal",
    "diurnal",
    "sings",
    "song",
    "flock",
    "territorial",
    "courtship",
    "behavior",
    "behaviour",
    "breeds",
    "nesting",
  ];
  const rangeKeywords = [
    "north america",
    "south america",
    "europe",
    "africa",
    "asia",
    "australia",
    "found",
    "range",
    "distribution",
    "native to",
    "widespread",
    "endemic",
  ];

  function findSentence(keywords: string[]): string {
    for (const s of sentences) {
      const lower = s.toLowerCase();
      if (keywords.some((kw) => lower.includes(kw))) {
        return s.trim();
      }
    }
    return "";
  }

  const habitat = findSentence(habitatKeywords) || "Habitat data not available.";
  const diet = findSentence(dietKeywords) || "Diet data not available.";
  const behavior = findSentence(behaviorKeywords) || "Behavior data not available.";
  const range = findSentence(rangeKeywords) || sentences[0] || "Range data not available.";

  return { habitat, diet, behavior, range };
}

export function extractFunFactsFromWikipedia(extract: string): string[] {
  const sentences = extract
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 30 && s.length < 200);

  // Pick up to 4 varied sentences as fun facts
  const interestingKeywords = [
    "largest",
    "smallest",
    "only",
    "unique",
    "known for",
    "famous",
    "species",
    "world",
    "record",
    "first",
    "remarkable",
    "unusual",
    "can",
    "year",
    "century",
    "discovered",
  ];

  const facts: string[] = [];
  for (const s of sentences) {
    if (facts.length >= 4) break;
    const lower = s.toLowerCase();
    if (interestingKeywords.some((kw) => lower.includes(kw))) {
      facts.push(s.trim());
    }
  }

  // Fill remaining slots with first sentences if needed
  for (const s of sentences) {
    if (facts.length >= 4) break;
    if (!facts.includes(s.trim())) {
      facts.push(s.trim());
    }
  }

  return facts.slice(0, 4);
}
