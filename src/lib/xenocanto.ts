export interface XenoCantoRecording {
  id: string;
  en: string; // English name
  gen: string; // Genus
  sp: string; // Species
  ssp: string; // Subspecies
  cnt: string; // Country
  loc: string; // Location
  q: string; // Quality (A-E)
  file: string; // Audio file URL
  "file-name": string;
  lic: string; // License
  url: string; // Recording page URL
}

export interface XenoCantoResponse {
  numRecordings: string;
  numSpecies: string;
  page: number;
  numPages: number;
  recordings: XenoCantoRecording[];
}

export async function fetchBirdRecording(
  scientificName: string
): Promise<string | null> {
  const query = encodeURIComponent(`${scientificName} q:A`);
  const url = `https://xeno-canto.org/api/2/recordings?query=${query}&page=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "BirdID-App/1.0 (bird identification tool)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data: XenoCantoResponse = await res.json();
    if (!data.recordings || data.recordings.length === 0) {
      // Try without quality filter
      return await fetchBirdRecordingFallback(scientificName);
    }

    // Prefer quality A, then any
    const rec = data.recordings[0];
    let fileUrl = rec.file;

    // Xeno-canto file URLs sometimes need the protocol
    if (fileUrl && !fileUrl.startsWith("http")) {
      fileUrl = `https:${fileUrl}`;
    }

    return fileUrl || null;
  } catch {
    return null;
  }
}

async function fetchBirdRecordingFallback(
  scientificName: string
): Promise<string | null> {
  const query = encodeURIComponent(scientificName);
  const url = `https://xeno-canto.org/api/2/recordings?query=${query}&page=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "BirdID-App/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data: XenoCantoResponse = await res.json();
    if (!data.recordings || data.recordings.length === 0) return null;

    const rec = data.recordings[0];
    let fileUrl = rec.file;
    if (fileUrl && !fileUrl.startsWith("http")) {
      fileUrl = `https:${fileUrl}`;
    }
    return fileUrl || null;
  } catch {
    return null;
  }
}
