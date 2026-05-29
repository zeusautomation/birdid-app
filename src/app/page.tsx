"use client";

import { useState, useCallback } from "react";
import UploadZone from "@/components/UploadZone";
import ResultCard, { BirdResult } from "@/components/ResultCard";
import LoadingState from "@/components/LoadingState";

type AppState = "idle" | "loading" | "result" | "error";

interface ErrorState {
  type: "no_bird" | "upload_failed" | "offline" | "generic";
  message: string;
  suggestion?: string;
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [result, setResult] = useState<BirdResult | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!navigator.onLine) {
      setError({ type: "offline", message: "You're offline." });
      setAppState("error");
      return;
    }

    setAppState("loading");
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/identify", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "no_bird") {
          setError({
            type: "no_bird",
            message: "Hmm. We couldn't find a bird in there.",
            suggestion: "Try a longer clip or get a little closer.",
          });
          setAppState("error");
        } else if (res.status === 503) {
          setError({
            type: "generic",
            message: data.error ?? "BirdNET not available.",
            suggestion: data.details,
          });
          setAppState("error");
        } else {
          setError({
            type: "upload_failed",
            message: data.error ?? "Something went wrong with the upload.",
          });
          setAppState("error");
        }
        return;
      }

      setResult(data as BirdResult);
      setAppState("result");
    } catch (err) {
      const isOffline = !navigator.onLine;
      if (isOffline) {
        setError({ type: "offline", message: "You're offline." });
      } else {
        setError({
          type: "upload_failed",
          message: "Something went wrong with the upload.",
        });
      }
      setAppState("error");
      console.error("Upload error:", err);
    }
  }, []);

  const handleReset = useCallback(() => {
    setAppState("idle");
    setResult(null);
    setError(null);
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐦</span>
          <span className="font-bold text-lg tracking-tight">BirdID</span>
        </div>
        <p className="text-slate-400 text-sm italic hidden sm:block">
          Hear a bird. Know it.
        </p>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Title (idle + error only) */}
        {(appState === "idle" || appState === "error") && (
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {appState === "idle" ? "What did you hear?" : ""}
              {appState === "error" && error?.type === "no_bird"
                ? error.message
                : ""}
              {appState === "error" && error?.type !== "no_bird"
                ? "What did you hear?"
                : ""}
            </h1>
            {appState === "idle" && (
              <>
                <p className="text-slate-400 text-lg">
                  Drop a sound clip or video — we&apos;ll handle the rest.
                </p>
                <p className="text-slate-500 text-sm mt-2 italic">
                  Heard something good?{" "}
                  <span className="text-slate-400">
                    Upload a sound or video and find out exactly who&apos;s out
                    there.
                  </span>
                </p>
              </>
            )}
            {appState === "error" && error?.suggestion && (
              <p className="text-slate-400 mt-2">{error.suggestion}</p>
            )}
          </div>
        )}

        {/* Content area */}
        <div className="w-full max-w-lg">
          {appState === "idle" && (
            <UploadZone onFileSelect={handleFileSelect} />
          )}

          {appState === "loading" && <LoadingState />}

          {appState === "result" && result && (
            <ResultCard result={result} onReset={handleReset} />
          )}

          {appState === "error" && (
            <div className="flex flex-col items-center gap-6">
              {/* Show error message for non-no_bird errors */}
              {error?.type !== "no_bird" && (
                <div className="w-full rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-center">
                  <p className="text-red-300 font-medium">{error?.message}</p>
                  {error?.suggestion && (
                    <p className="text-red-400/70 text-sm mt-1">
                      {error.suggestion}
                    </p>
                  )}
                </div>
              )}

              {/* Upload zone for retry */}
              <UploadZone onFileSelect={handleFileSelect} />

              {error?.type === "no_bird" && (
                <button
                  onClick={handleReset}
                  className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors"
                >
                  Start over
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center">
        <p className="text-slate-600 text-xs">
          Powered by BirdNET · Wikipedia · Xeno-canto · iNaturalist
        </p>
      </footer>
    </main>
  );
}
