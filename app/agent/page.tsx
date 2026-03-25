'use client';

import { useState } from 'react';
import { Message } from '@/components/chat/ChatMessage';
import ChatSection from '@/components/chat/ChatSection';
import CodeEditor from '@/components/editor/CodeEditor';

export default function AgentChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [repoName, setRepoName] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const addMessage = (
    role: 'user' | 'agent',
    content: string,
    data?: any,
    type?: string,
    node?: string,
    tool?: string,
  ) => {
    const message: Message = {
      id: Date.now().toString() + Math.random(),
      role,
      content,
      timestamp: new Date(),
      type,
      node,
      tool,
      data,
    };
    setMessages((prev) => [...prev, message]);
  };

  const runAgent = async () => {
    if (!input.trim() || !repoName.trim() || isRunning) return;

    const userQuery = input.trim();
    const repo = repoName.trim();

    addMessage('user', userQuery);
    setInput('');
    setIsRunning(true);

    try {
      const response = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery, repoName: repo }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.message) {
                addMessage('agent', data.message, data.data, data.type, data.node, data.tool);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error running agent:', error);
      addMessage('agent', `❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Left column — Chat */}
      <div className="w-105 shrink-0 flex flex-col h-full">
        <ChatSection
          messages={messages}
          input={input}
          setInput={setInput}
          repoName={repoName}
          setRepoName={setRepoName}
          isRunning={isRunning}
          onSend={runAgent}
        />
      </div>

      {/* Right column — Code Editor */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <CodeEditor repoName={repoName} />
      </div>
    </div>
  );
}
