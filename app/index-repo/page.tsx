"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Repo {
  name: string;
  hasIndex: boolean;
  indexedFiles: number;
}

interface IndexResult {
  success: boolean;
  totalFiles?: number;
  indexedFiles?: number;
  outputPath?: string;
  error?: string;
}

export default function IndexRepoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<IndexResult | null>(null);
  const [batchSize, setBatchSize] = useState(5);
  const [model, setModel] = useState("llama3.2");

  useEffect(() => {
    // Redirect to home if not signed in
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/list-repos");
      const data = await response.json();
      if (data.success) {
        setRepos(data.repos);
        if (data.repos.length > 0 && !selectedRepo) {
          setSelectedRepo(data.repos[0].name);
        }
      }
    } catch (error) {
      console.error("Error fetching repos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleIndex = async () => {
    if (!selectedRepo) {
      setResult({
        success: false,
        error: "Please select a repository",
      });
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/index-codebase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoName: selectedRepo,
          batchSize: batchSize,
          model: model,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({
          success: true,
          totalFiles: data.totalFiles,
          indexedFiles: data.indexedFiles,
          outputPath: data.outputPath,
        });
        // Refresh repos list to update index status
        fetchRepos();
      } else {
        setResult({
          success: false,
          error: data.error || "Failed to index repository",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: `Error: ${error}`,
      });
    } finally {
      setProcessing(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const selectedRepoData = repos.find((r) => r.name === selectedRepo);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📚 Index Codebase</h1>
          <p className="text-gray-300">
            Generate structured metadata for your repositories using AI
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Repository Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">
              Select Repository
            </label>
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              disabled={processing}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {repos.length === 0 ? (
                <option value="">No repositories found</option>
              ) : (
                repos.map((repo) => (
                  <option key={repo.name} value={repo.name}>
                    {repo.name}
                    {repo.hasIndex ? ` (✓ Indexed - ${repo.indexedFiles} files)` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Selected Repo Name Display */}
          {selectedRepo && (
            <div className="mb-6 p-4 bg-purple-500/20 border border-purple-400/30 rounded-lg">
              <div className="text-sm font-semibold text-purple-300 mb-1">
                Current Repository:
              </div>
              <div className="text-xl font-bold break-all">{selectedRepo}</div>
              {selectedRepoData?.hasIndex && (
                <div className="text-sm text-green-400 mt-2">
                  ✓ Already indexed with {selectedRepoData.indexedFiles} files
                </div>
              )}
            </div>
          )}

          {/* Advanced Options */}
          <details className="mb-6">
            <summary className="cursor-pointer text-sm font-semibold mb-4 hover:text-purple-300 transition">
              ⚙️ Advanced Options
            </summary>
            <div className="space-y-4 pl-4 border-l-2 border-purple-500/30">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Batch Size (files per round)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 5)}
                  disabled={processing}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none transition disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Ollama Model
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={processing}
                  placeholder="llama3.2"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none transition disabled:opacity-50"
                />
              </div>
            </div>
          </details>

          {/* Index Button */}
          <button
            onClick={handleIndex}
            disabled={processing || !selectedRepo || repos.length === 0}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-300 ${
              processing
                ? "bg-yellow-500/50 cursor-wait"
                : repos.length === 0 || !selectedRepo
                ? "bg-gray-500/50 cursor-not-allowed"
                : "bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            }`}
          >
            {processing ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              "🚀 Start Indexing"
            )}
          </button>

          {/* Status Messages */}
          {processing && (
            <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
              <div className="flex items-center">
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-yellow-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <div>
                  <div className="font-bold text-yellow-300">Processing Repository</div>
                  <div className="text-sm text-yellow-200">
                    Analyzing files with Ollama... This may take a few minutes.
                  </div>
                </div>
              </div>
            </div>
          )}

          {result && !processing && (
            <div
              className={`mt-6 p-4 rounded-lg border ${
                result.success
                  ? "bg-green-500/20 border-green-400/30"
                  : "bg-red-500/20 border-red-400/30"
              }`}
            >
              {result.success ? (
                <div>
                  <div className="font-bold text-2xl text-green-400 mb-2">
                    ✅ Done!
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-300">Total Files:</span>{" "}
                      <span className="font-semibold">{result.totalFiles}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">Indexed Files:</span>{" "}
                      <span className="font-semibold">{result.indexedFiles}</span>
                    </div>
                    <div className="text-gray-300 break-all">
                      <span>Output:</span>{" "}
                      <code className="text-green-300">{result.outputPath}</code>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-bold text-xl text-red-400 mb-2">
                    ❌ Error
                  </div>
                  <div className="text-sm text-red-200">{result.error}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-500/10 backdrop-blur-lg rounded-xl p-6 border border-blue-400/20">
          <h2 className="font-bold text-lg mb-3">💡 Before You Start</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              <span>
                Make sure <strong className="text-white">Ollama</strong> is running locally:{" "}
                <code className="bg-black/30 px-2 py-1 rounded text-blue-300">
                  ollama serve
                </code>
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              <span>
                Pull the required model:{" "}
                <code className="bg-black/30 px-2 py-1 rounded text-blue-300">
                  ollama pull llama3.2
                </code>
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              <span>Indexing will analyze your code and generate structured metadata for AI understanding</span>
            </li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/download")}
            className="text-purple-300 hover:text-purple-200 transition underline"
          >
            ← Back to Download Repos
          </button>
        </div>
      </div>
    </div>
  );
}
