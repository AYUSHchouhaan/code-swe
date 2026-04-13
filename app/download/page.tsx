"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RepoHeader } from "@/components/download/RepoHeader";
import { RepoGrid } from "@/components/download/RepoGrid";
import { DownloadToast } from "@/components/download/DownloadToast";
import type { GithubRepo, DownloadResult } from "@/components/download/types";

export default function DownloadRepoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setReposLoading(true);
    fetch("/api/github-repos")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setRepos(data.repos);
        else setReposError(data.error ?? "Failed to load repositories");
      })
      .catch(() => setReposError("Network error loading repositories"))
      .finally(() => setReposLoading(false));
  }, [status]);

  const handleDownload = async (repo: GithubRepo) => {
    setDownloadingId(repo.id);
    setDownloadResult(null);
    try {
      const response = await fetch("/api/download-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: repo.owner, repo: repo.name, branch: repo.default_branch }),
      });
      const data = await response.json();
      if (data.success) {
        router.push("/agent");
      } else {
        setDownloadResult({
          id: repo.id,
          success: false,
          message: data.error ?? "Download failed",
        });
      }
    } catch {
      setDownloadResult({ id: repo.id, success: false, message: "Network error" });
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-lg text-zinc-500">Loading…</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 font-sans">
      <RepoHeader session={session} search={search} onSearchChange={setSearch} />

      {downloadResult && (
        <DownloadToast result={downloadResult} onDismiss={() => setDownloadResult(null)} />
      )}

      <main className="px-6 py-8">
        <RepoGrid
          repos={filteredRepos}
          loading={reposLoading}
          error={reposError}
          search={search}
          downloadingId={downloadingId}
          onDownload={handleDownload}
        />
      </main>
    </div>
  );
}
