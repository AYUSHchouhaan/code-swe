interface ChatHeaderProps {
  repoName: string;
  setRepoName: (name: string) => void;
  isRunning: boolean;
}

export default function ChatHeader({ repoName, setRepoName, isRunning }: ChatHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <h1 className="text-2xl font-bold text-gray-900">SWE Agent Chat</h1>
      <div className="mt-2 flex gap-2 items-center">
        <label className="text-sm text-gray-600">Repository:</label>
        <input
          type="text"
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
          placeholder="e.g., AYUSHchouhaan-simple-project-1771061431055"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isRunning}
        />
      </div>
    </div>
  );
}
