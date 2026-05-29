"use client";

import { useRef, useState } from "react";

export interface BirdResult {
  species: string;
  scientificName: string;
  confidence: number;
  habitat?: string;
  diet?: string;
  behavior?: string;
  range?: string;
  description?: string;
  thumbnail?: string | null;
  wikiExtract?: string;
  soundUrl?: string | null;
  facts?: string[];
}

interface ResultCardProps {
  result: BirdResult;
  onReset: () => void;
}

const SECTION_ICONS: Record<string, string> = {
  habitat: "🌿",
  diet: "🍎",
  behavior: "🎭",
  range: "🗺️",
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : confidence >= 50
      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      : "bg-red-500/20 text-red-400 border-red-500/30";

  const label =
    confidence >= 80 ? "High confidence" : confidence >= 50 ? "Moderate" : "Low confidence";

  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}
    >
      {label} · {confidence}%
    </span>
  );
}

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  const toggle = () => {
    if (!audioRef.current || error) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setError(true));
      setPlaying(true);
    }
  };

  if (error) return null;

  return (
    <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-slate-700/40 border border-slate-600/40">
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        onError={() => setError(true)}
        preload="none"
      />
      <button
        onClick={toggle}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 
                   text-white transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        aria-label={playing ? "Pause sample" : "Play sample"}
      >
        {playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
        )}
      </button>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-300">Example call</span>
        <span className="text-xs text-slate-500">via Xeno-canto</span>
      </div>
    </div>
  );
}

export default function ResultCard({ result, onReset }: ResultCardProps) {
  const sections = [
    { key: "habitat", label: "Habitat", value: result.habitat },
    { key: "diet", label: "Diet", value: result.diet },
    { key: "behavior", label: "Behavior", value: result.behavior },
    { key: "range", label: "Range", value: result.range },
  ].filter((s) => s.value && !s.value.includes("not available"));

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 animate-fade-in">
      {/* Species header */}
      <div className="rounded-2xl bg-slate-800/70 border border-slate-700/50 p-6 flex gap-4">
        {result.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.thumbnail}
            alt={result.species}
            className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-600/40"
          />
        )}
        <div className="flex flex-col gap-2 min-w-0">
          <h2 className="text-2xl font-bold text-white leading-tight truncate">
            {result.species}
          </h2>
          <p className="text-slate-400 italic text-sm">{result.scientificName}</p>
          <ConfidenceBadge confidence={result.confidence} />
        </div>
      </div>

      {/* Info sections */}
      {sections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sections.map(({ key, label, value }) => (
            <div
              key={key}
              className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-4 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>{SECTION_ICONS[key]}</span>
                <span>{label}</span>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fun facts */}
      {result.facts && result.facts.length > 0 && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Stuff worth knowing
          </h3>
          <ul className="flex flex-col gap-2">
            {result.facts.map((fact, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-300 leading-relaxed">
                <span className="text-emerald-400 mt-0.5 shrink-0">✦</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Audio sample */}
      {result.soundUrl && <AudioPlayer src={result.soundUrl} />}

      {/* Try again */}
      <button
        onClick={onReset}
        className="mt-2 text-sm text-slate-400 hover:text-slate-200 underline underline-offset-4 
                   transition-colors self-center focus:outline-none focus:text-slate-200"
      >
        Identify another bird
      </button>
    </div>
  );
}
