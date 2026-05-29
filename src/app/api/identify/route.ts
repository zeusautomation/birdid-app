import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  analyzeBirdAudio,
  extractAudioFromVideo,
  extractFrameFromVideo,
  isBirdNetInstalled,
} from "@/lib/birdnet";
import { scoreImageWithINat, extractBirdFromINatResults } from "@/lib/inaturalist";

export const runtime = "nodejs";
export const maxDuration = 60;

const TMP_DIR = "/tmp/birdid";

function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }
}

function cleanupFiles(...files: string[]) {
  for (const f of files) {
    try {
      if (existsSync(f)) unlinkSync(f);
    } catch {
      // ignore cleanup errors
    }
  }
}

function isVideoFile(filename: string, mimeType: string): boolean {
  const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".3gp"];
  const videoMimes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/x-matroska"];
  const ext = path.extname(filename).toLowerCase();
  return videoExts.includes(ext) || videoMimes.includes(mimeType);
}

function isAudioFile(filename: string, mimeType: string): boolean {
  const audioExts = [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma", ".opus"];
  const audioMimes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/aac", "audio/mp4", "audio/x-wav"];
  const ext = path.extname(filename).toLowerCase();
  return audioExts.includes(ext) || audioMimes.some((m) => mimeType.startsWith(m));
}

export async function POST(req: NextRequest) {
  ensureTmpDir();

  let uploadedFilePath = "";
  let audioPath = "";
  let framePath = "";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase() || ".wav";
    const uuid = randomUUID();
    uploadedFilePath = path.join(TMP_DIR, `upload-${uuid}${ext}`);

    // Save uploaded file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(uploadedFilePath, buffer);

    const isVideo = isVideoFile(file.name, file.type);
    const isAudio = isAudioFile(file.name, file.type);

    let birdNetResults: Array<{ common_name: string; scientific_name: string; confidence: number }> = [];
    let iNatResult: { commonName: string; scientificName: string; confidence: number } | null = null;

    // Run BirdNET on audio
    if (!isBirdNetInstalled()) {
      return NextResponse.json(
        {
          error: "BirdNET not installed",
          details: "Run: pip install birdnet",
        },
        { status: 503 }
      );
    }

    if (isVideo) {
      // Extract audio for BirdNET
      audioPath = path.join(TMP_DIR, `audio-${uuid}.wav`);
      extractAudioFromVideo(uploadedFilePath, audioPath);

      // Extract frame for iNaturalist
      framePath = path.join(TMP_DIR, `frame-${uuid}.jpg`);
      try {
        extractFrameFromVideo(uploadedFilePath, framePath);
        const iNatResults = await scoreImageWithINat(framePath);
        iNatResult = extractBirdFromINatResults(iNatResults);
      } catch {
        // iNat is optional — continue without it
      }

      try {
        birdNetResults = analyzeBirdAudio(audioPath);
      } catch {
        // If audio extraction or analysis fails, rely on iNat only
      }
    } else if (isAudio) {
      audioPath = uploadedFilePath;
      birdNetResults = analyzeBirdAudio(audioPath);
    } else {
      // Unknown type — try as audio
      audioPath = uploadedFilePath;
      try {
        birdNetResults = analyzeBirdAudio(audioPath);
      } catch {
        return NextResponse.json(
          { error: "Unsupported file type. Please upload audio or video." },
          { status: 400 }
        );
      }
    }

    // Merge results — pick highest confidence species
    let topSpecies: {
      commonName: string;
      scientificName: string;
      confidence: number;
    } | null = null;

    if (birdNetResults.length > 0) {
      const top = birdNetResults[0];
      topSpecies = {
        commonName: top.common_name,
        scientificName: top.scientific_name,
        confidence: top.confidence,
      };
    }

    // Use iNat result if BirdNET has low confidence or no result
    if (
      iNatResult &&
      (!topSpecies || iNatResult.confidence > topSpecies.confidence)
    ) {
      topSpecies = iNatResult;
    }

    if (!topSpecies) {
      return NextResponse.json(
        {
          error: "no_bird",
          message: "Hmm. We couldn't find a bird in there.",
          suggestion: "Try a longer clip or get a little closer.",
        },
        { status: 422 }
      );
    }

    // Fetch species details
    const speciesRes = await fetch(
      `${req.nextUrl.origin}/api/species?name=${encodeURIComponent(topSpecies.commonName)}&scientific=${encodeURIComponent(topSpecies.scientificName)}`,
      { signal: AbortSignal.timeout(20000) }
    );

    let speciesData = {};
    if (speciesRes.ok) {
      speciesData = await speciesRes.json();
    }

    return NextResponse.json({
      species: topSpecies.commonName,
      scientificName: topSpecies.scientificName,
      confidence: Math.round(topSpecies.confidence * 100),
      ...speciesData,
    });
  } catch (err: unknown) {
    console.error("Identify error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Something went wrong with the upload.", details: message },
      { status: 500 }
    );
  } finally {
    // Cleanup temp files (but not if audio == uploadedFilePath and it's the same)
    const toClean = new Set([uploadedFilePath, framePath]);
    if (audioPath !== uploadedFilePath) toClean.add(audioPath);
    cleanupFiles(...Array.from(toClean).filter(Boolean));
  }
}
