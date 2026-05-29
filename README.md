# 🐦 BirdID

**Hear a bird. Know it.**

BirdID is a Next.js PWA that identifies bird species from audio or video recordings. Upload a sound clip or video → get instant species identification with habitat, diet, behavior, range, and fun facts.

## Features

- **Audio identification** via BirdNET-Analyzer (local Python library, privacy-first)
- **Video support** — extracts audio with ffmpeg for BirdNET, and first frame for iNaturalist visual ID
- **Rich species cards** with habitat, diet, behavior, range data from Wikipedia
- **Example bird calls** from Xeno-canto for playback
- **Fun facts** via Gemini 2.0 Flash or GPT-4o-mini (optional — falls back to Wikipedia)
- **PWA** — installable, works offline for cached content
- **Mobile-first** dark UI

## Setup

### Prerequisites

1. **Node.js 18+** — [nodejs.org](https://nodejs.org)
2. **Python 3.9+** — [python.org](https://python.org)
3. **ffmpeg** — required for video support
   ```bash
   # macOS
   brew install ffmpeg
   # Ubuntu/Debian
   sudo apt install ffmpeg
   ```

### Install BirdNET and dependencies

```bash
bash scripts/setup_birdnet.sh
```

Or manually:
```bash
pip install birdnet
```

### Configure environment (optional)

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add API keys if you want AI-generated fun facts:
- `GEMINI_API_KEY` — Gemini 2.0 Flash (preferred, very cheap)
- `OPENAI_API_KEY` — GPT-4o-mini (fallback)

Neither key is required — fun facts fall back to Wikipedia extraction.

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/identify` | POST | Upload audio/video, returns species identification |
| `/api/species` | GET | Fetch Wikipedia + Xeno-canto data for a species |

### `/api/identify`

**Request:** `multipart/form-data` with `file` field (audio or video)

**Response:**
```json
{
  "species": "American Robin",
  "scientificName": "Turdus migratorius",
  "confidence": 94,
  "habitat": "Found in woodlands, gardens, and parks...",
  "diet": "Eats earthworms, insects, and berries...",
  "behavior": "Migratory, known for its cheerful song...",
  "range": "Widespread across North America...",
  "soundUrl": "https://xeno-canto.org/sounds/uploaded/...",
  "facts": ["...", "...", "...", "..."],
  "thumbnail": "https://upload.wikimedia.org/..."
}
```

## Architecture

```
Upload (audio/video)
         │
         ▼
  /api/identify
         │
    ┌────┴────┐
    │         │
   Audio    Video
    │         │
    │    ffmpeg extract
    │    ├── audio.wav  ──► BirdNET
    │    └── frame.jpg  ──► iNaturalist CV
    │
    ▼
 BirdNET (Python)
    │ top species
    ▼
 Merge + pick highest confidence
    │
    ▼
 /api/species
    ├── Wikipedia REST API (habitat/diet/behavior/range)
    ├── Xeno-canto API (example recording)
    └── Gemini/OpenAI/Wikipedia (fun facts)
    │
    ▼
 Result card with audio player
```

## What works vs what's mocked

| Feature | Status |
|---------|--------|
| BirdNET audio analysis | ✅ Real — requires `pip install birdnet` |
| Video audio extraction (ffmpeg) | ✅ Real — requires `ffmpeg` |
| iNaturalist visual ID | ✅ Real — free API, no key |
| Wikipedia species data | ✅ Real — free API |
| Xeno-canto audio samples | ✅ Real — free API |
| Fun facts (Gemini/OpenAI) | ✅ Real if API key set |
| Fun facts fallback | ✅ Real — extracted from Wikipedia |
| PWA manifest | ✅ Real |
| PWA icons | ⚠️ Placeholder paths — add icon-192.png and icon-512.png to /public |

## Tech Stack

- **Next.js 14** App Router
- **TypeScript**
- **Tailwind CSS**
- **BirdNET-Analyzer** (Python) — ML-based bird sound ID
- **ffmpeg** — video/audio processing
- **Wikipedia REST API** — species data
- **Xeno-canto API** — example recordings  
- **iNaturalist CV API** — visual species ID
- **Gemini 2.0 Flash / GPT-4o-mini** — fun facts (optional)

## License

MIT
