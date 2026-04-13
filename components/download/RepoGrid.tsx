"use client";

import { RepoCard } from "./RepoCard";
import type { GithubRepo } from "./types";

interface RepoGridProps {
  repos: GithubRepo[];
  loading: boolean;
  error: string | null;
  search: string;
  downloadingId: number | null;
  onDownload: (repo: GithubRepo) => void;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24 text-zinc-400">
      <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Loading your repositories…
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="text-center py-16 text-zinc-400">
      {search ? "No repositories match your search." : "No repositories found."}
    </div>
  );
}

export function RepoGrid({ repos, loading, error, search, downloadingId, onDownload }: RepoGridProps) {
  if (loading) return <LoadingState />;
  if (error) return <div className="text-center py-16 text-red-500">{error}</div>;
  if (repos.length === 0) return <EmptyState search={search} />;

  return (
    <>
      <p className="text-xs text-zinc-400 mb-4">{repos.length} repositories</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {repos.map((repo) => (
          <RepoCard
            key={repo.id}
            repo={repo}
            onDownload={onDownload}
            downloading={downloadingId === repo.id}
          />
        ))}
      </div>
    </>
  );
}
