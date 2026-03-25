import UserMessage from './UserMessage';
import AIMessage from './AIMessage';
import GlobMessage from './messages/GlobMessage';
import GrepMessage from './messages/GrepMessage';
import FileOpMessage from './messages/FileOpMessage';
import ReasoningMessage from './messages/ReasoningMessage';
import NotesMessage from './messages/NotesMessage';
import PlanMessage from './messages/PlanMessage';
import CompleteTaskMessage from './messages/CompleteTaskMessage';
import ConclusionMessage from './messages/ConclusionMessage';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  /** SSE event type: 'tool_call' | 'reasoning' | 'result' | 'step' | 'complete' | 'phase' | 'start' | 'done' | 'error' */
  type?: string;
  /** Graph node that emitted this message */
  node?: string;
  /** Tool name for tool_call events: 'glob' | 'grep' | 'read' | 'edit' | 'create' */
  tool?: string;
  data?: any;
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === 'user') {
    return <UserMessage message={message} />;
  }

  const { type, node, tool } = message;

  // ── Tool calls ──────────────────────────────────────────────
  if (type === 'tool_call') {
    if (tool === 'glob') return <GlobMessage message={message} />;
    if (tool === 'grep') return <GrepMessage message={message} />;
    if (tool === 'read' || tool === 'edit' || tool === 'create') {
      return <FileOpMessage message={message} />;
    }
  }

  // ── Agent reasoning ─────────────────────────────────────────
  if (type === 'reasoning') return <ReasoningMessage message={message} />;

  // ── Planner results ─────────────────────────────────────────
  if (type === 'result' && node === 'generate-notes') return <NotesMessage message={message} />;
  if (type === 'result' && node === 'generate-plan') return <PlanMessage message={message} />;

  // ── Programmer milestones ────────────────────────────────────
  if (type === 'step' && node === 'complete-task') return <CompleteTaskMessage message={message} />;
  if (type === 'complete' && node === 'end-conclusion') return <ConclusionMessage message={message} />;

  // ── Fallback: generic AI bubble ─────────────────────────────
  return <AIMessage message={message} />;
}

