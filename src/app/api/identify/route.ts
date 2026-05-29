import { NextRequest, NextResponse } from "next/server";
import path from "path";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

function getAudioFormat(filename: string, mimeType: string): "wav" | "mp3" | "ogg" | "flac" | "m4a" | "webm" {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".wav") return "wav";
  if (ext === ".mp3") return "mp3";
  if (ext === ".ogg") return "ogg";
  if (ext === ".flac") return "flac";
  if (ext === ".m4a") return "m4a";
  if (ext === ".webm") return "webm";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp3") || mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("flac")) return "flac";
  return "wav";
}

interface BirdIdentification {
  commonName: string | null;
  scientificName: string | null;
  confidence: number;
  notes?: string;
}

async function identifyBirdFromAudio(
  base64Data: string,
  format: "wav" | "mp3" | "ogg" | "flac" | "m4a" | "webm"
): Promise<BirdIdentification> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (openai.chat.completions.create as any)({
      model: "gpt-4o-audio-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: {
                data: base64Data,
                format: format,
              },
            },
            {
              type: "text",
              text: 'Listen to this audio and identify any bird species you can hear. Return ONLY a JSON object with no markdown: {"common_name": "...", "scientific_name": "...", "confidence": 0.0-1.0, "notes": "..."}. If no bird is detected, return {"common_name": null, "scientific_name": null, "confidence": 0, "notes": "No bird detected"}.',
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      commonName: parsed.common_name || null,
      scientificName: parsed.scientific_name || null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      notes: parsed.notes,
    };
  } catch {
    // Fallback: transcribe with Whisper then ask GPT
    return await identifyBirdFallback(base64Data, format);
  }
}

async function identifyBirdFallback(
  base64Data: string,
  format: string
): Promise<BirdIdentification> {
  // Convert base64 to buffer and use Whisper
  const audioBuffer = Buffer.from(base64Data, "base64");
  const audioFile = new File([audioBuffer], `audio.${format}`, { type: `audio/${format}` });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      prompt: "Bird sounds, bird calls, bird song",
    });

    const transcribedText = transcription.text || "";

    // Now ask GPT to identify from description
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Based on this audio transcription of bird sounds: "${transcribedText}", identify the bird species. 
Return ONLY a JSON object with no markdown: {"common_name": "...", "scientific_name": "...", "confidence": 0.0-1.0, "notes": "..."}. 
If you cannot identify a bird, return {"common_name": null, "scientific_name": null, "confidence": 0, "notes": "Could not identify"}.`,
        },
      ],
      max_tokens: 200,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      commonName: parsed.common_name || null,
      scientificName: parsed.scientific_name || null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      notes: parsed.notes,
    };
  } catch {
    return { commonName: null, scientificName: null, confidence: 0, notes: "Identification failed" };
  }
}

async function identifyBirdFromVideo(base64Data: string): Promise<BirdIdentification> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
                detail: "low",
              },
            },
            {
              type: "text",
              text: 'What bird species do you see in this image or video frame? Return ONLY a JSON object with no markdown: {"common_name": "...", "scientific_name": "...", "confidence": 0.0-1.0, "notes": "..."}. If no bird is visible, return {"common_name": null, "scientific_name": null, "confidence": 0, "notes": "No bird visible"}.',
            },
          ],
        },
      ],
      max_tokens: 200,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      commonName: parsed.common_name || null,
      scientificName: parsed.scientific_name || null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.6,
      notes: parsed.notes,
    };
  } catch {
    return { commonName: null, scientificName: null, confidence: 0 };
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const isVideo = isVideoFile(file.name, file.type);
    const isAudio = isAudioFile(file.name, file.type);

    let result: BirdIdentification;

    if (isAudio) {
      const format = getAudioFormat(file.name, file.type);
      result = await identifyBirdFromAudio(base64Data, format);
    } else if (isVideo) {
      // For video: send as image to vision model (works for video thumbnails/frames)
      result = await identifyBirdFromVideo(base64Data);
    } else {
      // Try audio identification as fallback
      result = await identifyBirdFromAudio(base64Data, "wav");
    }

    if (!result.commonName) {
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
      `${req.nextUrl.origin}/api/species?name=${encodeURIComponent(result.commonName)}&scientific=${encodeURIComponent(result.scientificName ?? "")}`,
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
