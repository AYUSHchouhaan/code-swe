'use client';

import { useState } from 'react';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatMessages from '@/components/chat/ChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import { Message } from '@/components/chat/ChatMessage';

export default function AgentChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [repoName, setRepoName] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const addMessage = (role: 'user' | 'agent', content: string, data?: any) => {
    const message: Message = {
      id: Date.now().toString() + Math.random(),
      role,
      content,
      timestamp: new Date(),
      data,
    };
    setMessages((prev) => [...prev, message]);
  };

  const runAgent = async () => {
    if (!input.trim() || !repoName.trim() || isRunning) return;

    const userQuery = input.trim();
    const repo = repoName.trim();
    
    // Add user message
    addMessage('user', userQuery);
    setInput('');
    setIsRunning(true);

    try {
      const response = await fetch('/api/agent/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userQuery,
          repoName: repo,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

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
              
              // Add agent message for each update
              if (data.type === 'start') {
                addMessage('agent', data.message);
              } else if (data.type === 'node') {
                addMessage('agent', data.message);
              } else if (data.type === 'result') {
                addMessage('agent', data.message, data.data);
              } else if (data.type === 'step') {
                addMessage('agent', data.message, data.data);
              } else if (data.type === 'complete') {
                addMessage('agent', data.message, data.data);
              } else if (data.type === 'error') {
                addMessage('agent', data.message);
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
    <div className="flex flex-col h-screen bg-gray-50">
      <ChatHeader 
        repoName={repoName} 
        setRepoName={setRepoName} 
        isRunning={isRunning} 
      />
      
      <ChatMessages messages={messages} />
      
      <ChatInput 
        input={input} 
        setInput={setInput} 
        onSend={runAgent} 
        isRunning={isRunning} 
        repoName={repoName} 
      />
    </div>
  );
}
