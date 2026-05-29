import { NextRequest, NextResponse } from "next/server";
import {
  fetchWikipediaSummary,
  parseBirdInfoFromExtract,
} from "@/lib/wikipedia";
import { fetchBirdRecording } from "@/lib/xenocanto";
import { generateFunFacts } from "@/lib/funfacts";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const commonName = searchParams.get("name") ?? "";
  const scientificName = searchParams.get("scientific") ?? "";

  if (!commonName && !scientificName) {
    return NextResponse.json({ error: "name or scientific required" }, { status: 400 });
  }

  try {
    // Fetch Wikipedia data — try common name first, then scientific name
    let wikiData = await fetchWikipediaSummary(commonName);
    if (!wikiData && scientificName) {
      wikiData = await fetchWikipediaSummary(scientificName);
    }

    // Fetch Xeno-canto recording
    const soundUrl = scientificName
      ? await fetchBirdRecording(scientificName)
      : null;

    // Parse bird info from Wikipedia extract
    const extract = wikiData?.extract ?? "";
    const parsedInfo = parseBirdInfoFromExtract(extract);

    // Generate fun facts
    const facts = await generateFunFacts(commonName, scientificName, extract);

    return NextResponse.json({
      habitat: parsedInfo.habitat,
      diet: parsedInfo.diet,
      behavior: parsedInfo.behavior,
      range: parsedInfo.range,
      description: wikiData?.description ?? "",
      thumbnail: wikiData?.thumbnail ?? null,
      wikiExtract: extract,
      soundUrl,
      facts,
    });
  } catch (err: unknown) {
    console.error("Species lookup error:", err);
    return NextResponse.json(
      { error: "Species lookup failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
