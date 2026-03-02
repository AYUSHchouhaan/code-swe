import { useRef, useEffect } from 'react';
import ChatMessage, { Message } from './ChatMessage';

interface ChatMessagesProps {
  messages: Message[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          <p className="text-lg">No messages yet</p>
          <p className="text-sm mt-2">Enter a repository name and ask the agent to help with your codebase!</p>
        </div>
      )}

      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
