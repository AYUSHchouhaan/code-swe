"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DownloadRepoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [owner, setOwner] = useState("facebook");
  const [repo, setRepo] = useState("react");
  const [branch, setBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Redirect to home if not signed in
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handleDownload = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/download-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner,
          repo,
          branch,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen p-8 font-sans bg-zinc-50 dark:bg-zinc-900">
      <main className="max-w-2xl mx-auto">
        {/* Header with user info */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            GitHub Repository Downloader
          </h1>
          <div className="flex items-center gap-4">
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="User avatar"
                className="w-10 h-10 rounded-full"
              />
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {session.user?.name || "User"}
              </p>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Download form */}
        <div className="bg-white dark:bg-zinc-800 shadow-md rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-2">
                Repository Owner
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                placeholder="facebook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-2">
                Repository Name
              </label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                placeholder="react"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-2">
                Branch (optional)
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                placeholder="main"
              />
            </div>

            <button
              onClick={handleDownload}
              disabled={loading || !owner || !repo}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Downloading..." : "Download Repository"}
            </button>
          </div>
        </div>

        {/* Result message */}
        {result && (
          <div
            className={`rounded-lg p-6 ${
              result.success
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            }`}
          >
            <h3
              className={`text-lg font-semibold mb-2 ${
                result.success
                  ? "text-green-800 dark:text-green-200"
                  : "text-red-800 dark:text-red-200"
              }`}
            >
              {result.success ? "✓ Success" : "✗ Error"}
            </h3>
            <div
              className={
                result.success
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              }
            >
              {result.success ? (
                <>
                  <p className="mb-2">{result.message}</p>
                  <p className="text-sm font-mono bg-white dark:bg-zinc-800 p-2 rounded border border-green-300 dark:border-green-700">
                    {result.path}
                  </p>
                </>
              ) : (
                <p>{result.error}</p>
              )}
            </div>
          </div>
        )}

        {/* Info section */}
        <div className="mt-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-50">
            How it works
          </h2>
          <ul className="list-disc list-inside space-y-2 text-zinc-700 dark:text-zinc-300">
            <li>
              Repositories are downloaded using your authenticated GitHub token
            </li>
            <li>
              Downloaded files are saved to the <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded">public/downloads</code> folder
            </li>
            <li>
              You can access any public repository or private repositories you have access to
            </li>
            <li>
              Your token includes repo permissions for future PR functionality
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
