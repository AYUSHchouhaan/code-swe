"use client";

import { useState } from "react";
import type { GithubRepo } from "./types";

interface RepoCardProps {
  repo: GithubRepo;
  onDownload: (repo: GithubRepo) => void;
  downloading: boolean;
}

function DownloadButton({ downloading, hovered }: { downloading: boolean; hovered: boolean }) {
  return (
    <button
      type="button"
      disabled={downloading}
      className={`absolute top-3 right-3 z-10 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
        hovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
      } ${
        downloading
          ? "bg-zinc-400 cursor-not-allowed text-white"
          : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
      }`}
    >
      {downloading ? (
        <>
          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Downloading…
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
          </svg>
          Download
        </>
      )}
    </button>
  );
}

function RepoMeta({ language, stars, updatedAt }: { language: string | null; stars: number; updatedAt: string }) {
  return (
    <div className="flex items-center gap-3 mt-auto pt-1 text-xs text-zinc-400 dark:text-zinc-500">
      {language && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          {language}
        </span>
      )}
      <span>⭐ {stars}</span>
      <span className="ml-auto">
        {new Date(updatedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
      </span>
    </div>
  );
}

export function RepoCard({ repo, onDownload, downloading }: RepoCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 flex flex-col gap-2 transition-shadow duration-200 hover:shadow-lg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !downloading && onDownload(repo)}
    >
      <DownloadButton downloading={downloading} hovered={hovered} />

      {/* Name + visibility badge */}
      <div className="flex items-center gap-2 pr-20">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{repo.name}</span>
        {repo.private && (
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
            Private
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-10">
        {repo.description ?? <span className="italic opacity-50">No description</span>}
      </p>

      <RepoMeta language={repo.language} stars={repo.stargazers_count} updatedAt={repo.updated_at} />
    </div>
  );
}
