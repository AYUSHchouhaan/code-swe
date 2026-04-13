"use client";

import type { DownloadResult } from "./types";

interface DownloadToastProps {
  result: DownloadResult;
  onDismiss: () => void;
}

export function DownloadToast({ result, onDismiss }: DownloadToastProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all ${
        result.success ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {result.success ? "✓" : "✗"} {result.message}
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}
