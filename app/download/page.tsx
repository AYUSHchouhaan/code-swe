"use client";

import { useState } from "react";

export default function DownloadRepoPage() {
  const [owner, setOwner] = useState("facebook");
  const [repo, setRepo] = useState("react");
  const [branch, setBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

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

  return (
    <div className="min-h-screen p-8 font-sans">
      <main className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">GitHub Repository Downloader</h1>
        
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repository Owner
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="facebook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repository Name
              </label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="react"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch (optional)
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="main"
              />
            </div>

            <button
              onClick={handleDownload}
              disabled={loading || !owner || !repo}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Downloading..." : "Download Repository"}
            </button>
          </div>
        </div>

        {result && (
          <div
            className={`rounded-lg p-6 ${
              result.success
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <h3
              className={`text-lg font-semibold mb-2 ${
                result.success ? "text-green-800" : "text-red-800"
              }`}
            >
              {result.success ? "✓ Success" : "✗ Error"}
            </h3>
            <div className={result.success ? "text-green-700" : "text-red-700"}>
              {result.success ? (
                <>
                  <p className="mb-2">{result.message}</p>
                  <p className="text-sm font-mono bg-white p-2 rounded border border-green-300">
                    {result.path}
                  </p>
                </>
              ) : (
                <p>{result.error}</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Create a GitHub App at github.com/settings/apps</li>
            <li>Generate a private key and note your App ID</li>
            <li>Install the app on your repositories</li>
            <li>Add environment variables to .env.local:
              <pre className="mt-2 bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`GITHUB_APP_ID=your_app_id
GITHUB_APP_INSTALLATION_ID=your_installation_id
GITHUB_PRIVATE_KEY="-----BEGIN RSA..."`}
              </pre>
            </li>
            <li>Restart your dev server</li>
          </ol>
          <p className="mt-4 text-sm text-gray-600">
            See <code className="bg-gray-200 px-2 py-1 rounded">README-GITHUB-DOWNLOAD.md</code> for detailed instructions.
          </p>
        </div>
      </main>
    </div>
  );
}
