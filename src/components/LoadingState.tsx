"use client";

import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "Analyzing audio…",
  "Listening for patterns…",
  "Almost there — cross-checking range data…",
];

export default function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const intervals = [2000, 2500];
    let i = 0;

    const advance = () => {
      i++;
      if (i < LOADING_MESSAGES.length) {
        setMessageIndex(i);
        const next = intervals[i - 1];
        if (next) {
          setTimeout(advance, next);
        }
      }
    };

    const t = setTimeout(advance, intervals[0]);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      {/* Animated waveform */}
      <div className="flex items-end gap-1 h-12">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 bg-emerald-400 rounded-full animate-pulse"
            style={{
              height: `${Math.random() * 60 + 20}%`,
              animationDelay: `${i * 80}ms`,
              animationDuration: `${600 + Math.random() * 400}ms`,
            }}
          />
        ))}
      </div>

      {/* Status message */}
      <p className="text-slate-300 text-sm animate-pulse transition-all duration-500">
        {LOADING_MESSAGES[messageIndex]}
      </p>
    </div>
  );
}
