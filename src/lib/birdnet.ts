/**
 * BirdNET identification via HuggingFace Inference API — free, no key required.
 * Model: kadirnar/birdnet-v2.4
 * Falls back gracefully if the model is loading or unavailable.
 */

export interface BirdNetResult {
  common_name: string;
  scientific_name: string;
  confidence: number;
}

interface HFClassificationItem {
  label: string;
  score: number;
}

/**
 * Parse a BirdNET label into common/scientific name.
 * BirdNET v2.4 labels are typically: "Common Name_Scientific Name"
 * e.g. "American Robin_Turdus migratorius"
 */
function parseLabel(label: string): { common_name: string; scientific_name: string } {
  const parts = label.split("_");
  if (parts.length >= 2) {
    const common_name = parts[0].trim();
    const scientific_name = parts.slice(1).join(" ").trim();
    return { common_name, scientific_name };
  }
  return { common_name: label.trim(), scientific_name: "" };
}

/**
 * Analyze audio buffer using HuggingFace BirdNET inference endpoint.
 * No API key required for public models; pass HF_TOKEN env var for higher rate limits.
 */
export async function analyzeAudioWithHuggingFace(
  audioBuffer: ArrayBuffer
): Promise<BirdNetResult[]> {
  const token = process.env.HF_TOKEN;
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/kadirnar/birdnet-v2.4",
      {
        method: "POST",
        headers,
        body: audioBuffer,
        signal: AbortSignal.timeout(25000),
      }
    );

    if (!res.ok) {
      console.warn(`HuggingFace BirdNET returned ${res.status}`);
      return [];
    }

    const data = await res.json();

    // HF audio classification format: [{label: "...", score: 0.9}, ...]
    if (Array.isArray(data) && data.length > 0 && data[0]?.label !== undefined) {
      return (data as HFClassificationItem[]).slice(0, 5).map((item) => {
        const { common_name, scientific_name } = parseLabel(item.label);
        return {
          common_name,
          scientific_name,
          confidence: typeof item.score === "number" ? item.score : 0,
        };
      });
    }

    // Model may return {error: "..."} if loading
    if (data?.error) {
      console.warn("HuggingFace BirdNET error:", data.error);
    }

    return [];
  } catch (err) {
    console.warn("HuggingFace BirdNET fetch failed:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
