import { Message } from './ChatMessage';

interface UserMessageProps {
  message: Message;
}

export default function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[70%] rounded-lg px-4 py-2 bg-blue-600 text-white">
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        <div className="text-xs mt-1 text-blue-100">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
