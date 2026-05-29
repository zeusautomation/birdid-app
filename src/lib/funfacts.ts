export async function generateFunFacts(
  commonName: string,
  scientificName: string,
  wikiExtract: string
): Promise<string[]> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    try {
      return await fetchGeminiFacts(commonName, scientificName, geminiKey);
    } catch {
      // fall through
    }
  }

  if (openaiKey) {
    try {
      return await fetchOpenAIFacts(commonName, scientificName, openaiKey);
    } catch {
      // fall through
    }
  }

  // Fallback: extract from Wikipedia text
  return extractFactsFromWiki(wikiExtract, commonName);
}

async function fetchGeminiFacts(
  commonName: string,
  scientificName: string,
  apiKey: string
): Promise<string[]> {
  const prompt = `Give me 4 fascinating, concise fun facts about the ${commonName} (${scientificName}). 
Each fact should be one sentence, under 120 characters, surprising or little-known.
Return as a JSON array of strings only, no markdown.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseFactsJson(text);
}

async function fetchOpenAIFacts(
  commonName: string,
  scientificName: string,
  apiKey: string
): Promise<string[]> {
  const prompt = `Give me 4 fascinating, concise fun facts about the ${commonName} (${scientificName}). 
Each fact should be one sentence, under 120 characters, surprising or little-known.
Return as a JSON array of strings only, no markdown.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return parseFactsJson(text);
}

function parseFactsJson(text: string): string[] {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((f) => typeof f === "string")
        .slice(0, 4);
    }
  } catch {
    // Try to extract array manually
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr)) return arr.filter((f) => typeof f === "string").slice(0, 4);
      } catch {
        // ignore
      }
    }
  }
  return [];
}

function extractFactsFromWiki(extract: string, commonName: string): string[] {
  const sentences = extract
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 220);

  const interestingKeywords = [
    "largest",
    "smallest",
    "only",
    "unique",
    "known for",
    "can reach",
    "species",
    "world",
    "record",
    "remarkable",
    "unusual",
    "despite",
    "however",
    "unlike",
    "surprisingly",
  ];

  const facts: string[] = [];

  for (const s of sentences) {
    if (facts.length >= 4) break;
    const lower = s.toLowerCase();
    if (interestingKeywords.some((kw) => lower.includes(kw))) {
      facts.push(s);
    }
  }

  for (const s of sentences) {
    if (facts.length >= 4) break;
    if (!facts.includes(s)) facts.push(s);
  }

  if (facts.length === 0) {
    facts.push(
      `The ${commonName} is a fascinating bird species with unique adaptations.`
    );
  }

  return facts.slice(0, 4);
}
