import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { analyzeAudioWithHuggingFace } from "@/lib/birdnet";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── File type helpers ────────────────────────────────────────────────────────

function isVideoFile(filename: string, mimeType: string): boolean {
  const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".3gp"];
  const videoMimes = [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska",
  ];
  const ext = path.extname(filename).toLowerCase();
  return videoExts.includes(ext) || videoMimes.includes(mimeType);
}

function isAudioFile(filename: string, mimeType: string): boolean {
  const audioExts = [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma", ".opus"];
  const audioMimes = [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/flac",
    "audio/aac",
    "audio/mp4",
    "audio/x-wav",
    "audio/webm",
  ];
  const ext = path.extname(filename).toLowerCase();
  return audioExts.includes(ext) || audioMimes.some((m) => mimeType.startsWith(m));
}

function isImageFile(filename: string, mimeType: string): boolean {
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff"];
  const imageMimes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];
  const ext = path.extname(filename).toLowerCase();
  return imageExts.includes(ext) || imageMimes.some((m) => mimeType.startsWith(m));
}

// ─── Identification helpers ───────────────────────────────────────────────────

interface BirdIdentification {
  commonName: string;
  scientificName: string | null;
  confidence: number;
  notes?: string;
}

/**
 * Try HuggingFace BirdNET for audio identification.
 * Free — no API key required (HF_TOKEN env var optional for higher limits).
 */
async function tryHuggingFaceBirdNET(file: File): Promise<BirdIdentification | null> {
  try {
    const buffer = await file.arrayBuffer();
    const results = await analyzeAudioWithHuggingFace(buffer);

    if (results.length > 0 && results[0].confidence > 0.05) {
      const top = results[0];
      return {
        commonName: top.common_name,
        scientificName: top.scientific_name || null,
        confidence: top.confidence,
        notes: `Identified via BirdNET (confidence: ${Math.round(top.confidence * 100)}%)`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Try iNaturalist computer vision for image identification.
 * Free — no API key required.
 */
async function tryInatImage(file: File): Promise<BirdIdentification | null> {
  try {
    const form = new FormData();
    form.append("image", file);

    const res = await fetch(
      "https://api.inaturalist.org/v1/computervision/score_image",
      {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const results = data.results ?? [];

    for (const result of results) {
      const score: number = result.combined_score ?? result.score ?? 0;
      if (score < 0.05) continue;

      const taxon = result.taxon ?? {};
      const scientificName: string = taxon.name ?? "";
      const commonName: string =
        taxon.preferred_common_name ?? taxon.name ?? "";

      if (!scientificName && !commonName) continue;

      return {
        commonName,
        scientificName: scientificName || null,
        confidence: score,
        notes: "Identified via iNaturalist computer vision",
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Try iNaturalist sound scoring (experimental endpoint).
 * May not be available — fails silently.
 */
async function tryInatSound(file: File): Promise<BirdIdentification | null> {
  try {
    const form = new FormData();
    form.append("audio", file);

    const res = await fetch(
      "https://api.inaturalist.org/v1/computervision/score_sound",
      {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const results = data.results ?? [];
    const top = results[0];

    if (top?.taxon?.name) {
      return {
        commonName: top.taxon.preferred_common_name ?? top.taxon.name,
        scientificName: top.taxon.name,
        confidence: top.combined_score ?? 0.6,
        notes: "Identified via iNaturalist sound scoring",
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const isVideo = isVideoFile(file.name, file.type);
    const isAudio = isAudioFile(file.name, file.type);
    const isImage = isImageFile(file.name, file.type);

    let result: BirdIdentification | null = null;

    if (isAudio) {
      // 1. Try HuggingFace BirdNET (best for audio)
      result = await tryHuggingFaceBirdNET(file);

      // 2. Try iNaturalist sound endpoint (experimental fallback)
      if (!result) {
        result = await tryInatSound(file);
      }
    } else if (isVideo) {
      // For video: try BirdNET on the audio track first
      result = await tryHuggingFaceBirdNET(file);

      // Then try iNat (will likely reject video, but worth a shot)
      if (!result) {
        result = await tryInatImage(file);
      }
    } else if (isImage) {
      // 1. Try iNaturalist computer vision (confirmed working, free)
      result = await tryInatImage(file);

      // 2. Try HuggingFace as fallback (unlikely to work for images but try)
      if (!result) {
        result = await tryHuggingFaceBirdNET(file);
      }
    } else {
      // Unknown type: attempt audio identification
      result = await tryHuggingFaceBirdNET(file);
    }

    if (!result || !result.commonName) {
      return NextResponse.json(
        {
          error: "no_bird",
          message: "Hmm. We couldn't find a bird in there.",
          suggestion:
            isVideo || isAudio
              ? "Try a longer clip or get closer to the bird."
              : "Make sure the bird is clearly visible in the image.",
        },
        { status: 422 }
      );
    }

    // Fetch species details from /api/species (uses Wikipedia + Xeno-canto — all free)
    const speciesRes = await fetch(
      `${req.nextUrl.origin}/api/species?name=${encodeURIComponent(
        result.commonName
      )}&scientific=${encodeURIComponent(result.scientificName ?? "")}`,
      { signal: AbortSignal.timeout(20000) }
    );

    let speciesData = {};
    if (speciesRes.ok) {
      speciesData = await speciesRes.json();
    }

    return NextResponse.json({
      species: result.commonName,
      scientificName: result.scientificName,
      confidence: Math.round(result.confidence * 100),
      notes: result.notes,
      ...speciesData,
    });
  } catch (err: unknown) {
    console.error("Identify error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Something went wrong with the upload.", details: message },
      { status: 500 }
    );
  }
}
