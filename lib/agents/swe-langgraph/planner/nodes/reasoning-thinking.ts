import type { AIMessage } from '@langchain/core/messages';
import type { PlannerState } from '../types';

/**
 * Node: reasoning-thinking (planner)
 *
 * Handles plain-text LLM responses from generate-plan-context-action that
 * contain no tool call — this is the model thinking through the codebase
 * before it decides which tool to use next.
 *
 * The content is:
 *   - console.logged on the backend so devs can follow the reasoning
 *   - returned as a state update so the SSE stream in route.ts can forward
 *     it to the frontend under the "reasoning-thinking" node name
 *
 * After this node the graph loops back to generate-plan-context-action.
 */
export async function plannerReasoningThinkingNode(
  state: PlannerState
): Promise<Partial<PlannerState>> {
  // console.log('\n=== PLANNER NODE: reasoning-thinking ===');

  // const lastAI = [...state.messages].reverse().find((m) => m.getType() === 'ai') as
  //   | AIMessage
  //   | undefined;

  // Content was already logged by generate-plan-context-action.
  // This node exists only to provide a named graph step for routing purposes.
  // void lastAI;

  return {};
}
