'use client';

import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { Message } from './ChatMessage';

interface ChatSectionProps {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  repoName: string;
  setRepoName: (v: string) => void;
  isRunning: boolean;
  onSend: () => void;
}

export default function ChatSection({
  messages,
  input,
  setInput,
  repoName,
  setRepoName,
  isRunning,
  onSend,
}: ChatSectionProps) {
  return (
    <div className="flex flex-col h-full border-r border-gray-200 bg-gray-50">
      <ChatHeader repoName={repoName} setRepoName={setRepoName} isRunning={isRunning} />
      <ChatMessages messages={messages} />
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={onSend}
        isRunning={isRunning}
        repoName={repoName}
      />
    </div>
  );
}
