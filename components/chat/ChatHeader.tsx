'use client';

import { useEffect, useState } from 'react';

interface ChatHeaderProps {
  repoName: string;
  setRepoName: (name: string) => void;
  isRunning: boolean;
}

export default function ChatHeader({ repoName, setRepoName, isRunning }: ChatHeaderProps) {
  const [repos, setRepos] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/list-repos')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setRepos(data.repos.map((r: { name: string }) => r.name));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <h1 className="text-2xl font-bold text-gray-900">SWE Agent Chat</h1>
      <div className="mt-2 flex gap-2 items-center">
        <label className="text-sm text-gray-600 shrink-0">Repository:</label>
        <select
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
          disabled={isRunning}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
        >
          <option value="">— select a downloaded repo —</option>
          {repos.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
