import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import type { PlanStep } from '../planner/types';

export type { PlanStep };

export const ProgrammerStateAnnotation = Annotation.Root({
  /** The user's original query */
  query: Annotation<string>,

  /** Absolute path to the repo on disk */
  repoPath: Annotation<string>,

  /** Task plan from the planner agent — each entry has index, plan, completed */
  plan: Annotation<PlanStep[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  /** Context notes from the planner agent */
  notes: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),

  /** Directory tree of the codebase */
  codebaseTree: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),

  /**
   * Internal conversation messages — the main context.
   * HumanMessage, AIMessage (with tool_calls), ToolMessage flow.
   */
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  /** Summary produced by end-conclusion node */
  summary: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
});

export type ProgrammerState = typeof ProgrammerStateAnnotation.State;
