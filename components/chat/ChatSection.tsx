'use client';

import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { Message } from './ChatMessage';

interface ChatSectionProps {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  owner: string;
  repoName: string;
  setRepoName: (v: string) => void;
  isRunning: boolean;
  onSend: () => void;
}

export default function ChatSection({
  messages,
  input,
  setInput,
  owner,
  repoName,
  setRepoName,
  isRunning,
  onSend,
}: ChatSectionProps) {
  return (
    <div className="flex flex-col h-full border-r border-zinc-700 bg-zinc-900">
      <ChatHeader repoName={repoName} setRepoName={setRepoName} isRunning={isRunning} />
      <ChatMessages messages={messages} />
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={onSend}
        isRunning={isRunning}
        owner={owner}
        repoName={repoName}
      />
    </div>
  );
}
