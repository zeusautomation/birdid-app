"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/mp4",
  "audio/x-wav",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
];

const ACCEPTED_EXTENSIONS = ".mp3,.wav,.ogg,.flac,.aac,.m4a,.opus,.mp4,.mov,.avi,.webm,.mkv";

export default function UploadZone({ onFileSelect, disabled }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (disabled) return;
      onFileSelect(file);
    },
    [disabled, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload a recording"
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative w-full rounded-2xl border-2 border-dashed p-10 sm:p-16 
        flex flex-col items-center gap-4 text-center
        transition-all duration-200 cursor-pointer select-none
        ${isDragOver
          ? "border-emerald-400 bg-emerald-400/10 scale-[1.01]"
          : "border-slate-600 hover:border-slate-400 hover:bg-white/5"
        }
        ${disabled ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-slate-700/60 flex items-center justify-center text-3xl">
        🎙️
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-slate-200 font-medium text-lg">
          Drop a sound clip or video — we&apos;ll handle the rest.
        </p>
        <p className="text-slate-500 text-sm">
          MP3, WAV, OGG, FLAC, AAC, MP4, MOV, WebM
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        disabled={disabled}
        className="mt-2 px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 
                   text-white font-semibold text-sm transition-colors duration-150
                   disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none 
                   focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        Upload a recording
      </button>
    </div>
  );
}
