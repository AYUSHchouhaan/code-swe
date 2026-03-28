'use client';

import { useState } from 'react';
import { Send, GitPullRequest } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  onSend: () => void;
  isRunning: boolean;
  owner: string;
  repoName: string;
}

export default function ChatInput({ input, setInput, onSend, isRunning, owner, repoName }: ChatInputProps) {
  const [prLoading, setPrLoading] = useState(false);
  const [prStatus, setPrStatus] = useState<{ url?: string; error?: string } | null>(null);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleCreatePR = async () => {
    if (!owner.trim() || !repoName.trim() || prLoading) return;
    setPrLoading(true);
    setPrStatus(null);
    try {
      const res = await fetch('/api/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: owner.trim(), repoName: repoName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setPrStatus({ url: data.prUrl });
      } else {
        setPrStatus({ error: data.error || 'Failed to create PR' });
      }
    } catch (e) {
      setPrStatus({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setPrLoading(false);
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="max-w-4xl mx-auto flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask the agent to help with your codebase..."
          className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          disabled={isRunning || !repoName}
        />
        <button
          onClick={onSend}
          disabled={isRunning || !input.trim() || !repoName}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shrink-0"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Running...
            </>
          ) : (
            <>
              <Send size={18} />
              Send
            </>
          )}
        </button>
        <button
          onClick={handleCreatePR}
          disabled={prLoading || !owner.trim() || !repoName.trim()}
          title="Create Pull Request on GitHub"
          className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shrink-0"
        >
          {prLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <GitPullRequest size={18} />
          )}
          PR
        </button>
      </div>
      {prStatus?.url && (
        <div className="mt-2 text-sm text-green-600">
          PR created:{' '}
          <a href={prStatus.url} target="_blank" rel="noopener noreferrer" className="underline">
            {prStatus.url}
          </a>
        </div>
      )}
      {prStatus?.error && (
        <div className="mt-2 text-sm text-red-600">Error: {prStatus.error}</div>
      )}
    </div>
  );
}
