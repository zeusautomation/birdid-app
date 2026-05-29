import { execSync, spawnSync } from "child_process";
import path from "path";
import fs from "fs";

export interface BirdNetResult {
  common_name: string;
  scientific_name: string;
  confidence: number;
}

export function isBirdNetInstalled(): boolean {
  const result = spawnSync("python3", ["-c", "import birdnet"], {
    encoding: "utf-8",
    timeout: 5000,
  });
  return result.status === 0;
}

export function analyzeBirdAudio(filePath: string): BirdNetResult[] {
  if (!isBirdNetInstalled()) {
    throw new Error(
      "BirdNET is not installed. Please run: pip install birdnet"
    );
  }

  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Audio file not found: ${absPath}`);
  }

  const script = `
import json, sys
try:
    from birdnet import BirdNET
    analyzer = BirdNET()
    results = analyzer.analyze_file(${JSON.stringify(absPath)})
    if results:
        out = []
        for r in results:
            if isinstance(r, dict):
                out.append({
                    "common_name": r.get("common_name", r.get("label", "Unknown")),
                    "scientific_name": r.get("scientific_name", ""),
                    "confidence": float(r.get("confidence", r.get("score", 0)))
                })
        # Sort by confidence descending
        out.sort(key=lambda x: x["confidence"], reverse=True)
        print(json.dumps(out[:5]))
    else:
        print(json.dumps([]))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

  const result = spawnSync("python3", ["-c", script], {
    encoding: "utf-8",
    timeout: 60000,
  });

  if (result.status !== 0) {
    const errText = result.stderr?.trim() || "BirdNET analysis failed";
    throw new Error(errText);
  }

  const stdout = result.stdout?.trim();
  if (!stdout) {
    return [];
  }

  try {
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed)) {
      return parsed as BirdNetResult[];
    }
    return [];
  } catch {
    throw new Error(`Failed to parse BirdNET output: ${stdout}`);
  }
}

export function extractAudioFromVideo(
  videoPath: string,
  outputPath: string
): void {
  try {
    execSync(
      `ffmpeg -y -i ${JSON.stringify(videoPath)} -vn -acodec pcm_s16le -ar 44100 -ac 1 ${JSON.stringify(outputPath)} 2>&1`,
      { timeout: 30000 }
    );
  } catch (err: unknown) {
    throw new Error(
      `ffmpeg audio extraction failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function extractFrameFromVideo(
  videoPath: string,
  outputPath: string
): void {
  try {
    execSync(
      `ffmpeg -y -i ${JSON.stringify(videoPath)} -vframes 1 -q:v 2 ${JSON.stringify(outputPath)} 2>&1`,
      { timeout: 30000 }
    );
  } catch (err: unknown) {
    throw new Error(
      `ffmpeg frame extraction failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
