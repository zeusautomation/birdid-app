import fs from "fs";
import path from "path";

export interface INatTaxon {
  name: string; // scientific name
  preferred_common_name?: string;
  score: number;
  taxon?: {
    id: number;
    name: string;
    preferred_common_name?: string;
    rank: string;
  };
}

export interface INatResponse {
  results: INatTaxon[];
}

export async function scoreImageWithINat(
  imagePath: string
): Promise<INatTaxon[]> {
  const absPath = path.resolve(imagePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Image not found: ${absPath}`);
  }

  // Use node-fetch style with FormData for multipart upload
  const boundary = `----FormBoundary${Date.now().toString(16)}`;
  const fileBuffer = fs.readFileSync(absPath);
  const fileName = path.basename(absPath);

  // Build multipart body manually (no native FormData file support in Node fetch)
  const CRLF = "\r\n";
  const parts: Buffer[] = [];

  const headerPart = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="image"; filename="${fileName}"`,
    `Content-Type: image/jpeg`,
    "",
    "",
  ].join(CRLF);

  parts.push(Buffer.from(headerPart));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`));

  const body = Buffer.concat(parts);

  try {
    const res = await fetch(
      "https://api.inaturalist.org/v1/computervision/score_image",
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length.toString(),
          "User-Agent": "BirdID-App/1.0",
        },
        body: body,
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`iNaturalist API error ${res.status}: ${text}`);
    }

    const data: INatResponse = await res.json();
    return data.results ?? [];
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error("iNaturalist CV API timed out");
    }
    throw err;
  }
}

export function extractBirdFromINatResults(
  results: INatTaxon[]
): { commonName: string; scientificName: string; confidence: number } | null {
  // Filter for birds (Aves class) — iNat returns mixed taxa
  // We can't easily filter by class without extra API call, so just use top result
  // that has reasonable confidence
  for (const result of results) {
    const score = result.score ?? 0;
    if (score < 0.05) continue;

    const taxon = result.taxon;
    const commonName =
      taxon?.preferred_common_name ?? result.preferred_common_name ?? "";
    const scientificName = taxon?.name ?? result.name ?? "";

    if (scientificName) {
      return {
        commonName,
        scientificName,
        confidence: score,
      };
    }
  }
  return null;
}
