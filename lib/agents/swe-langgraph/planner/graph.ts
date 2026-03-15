import { END, START, StateGraph } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { PlannerStateAnnotation, PlannerState } from './types';
import {
  generatePlanContextActionNode,
  takeActionContextNode,
  generatePlanNode,
  notesNode,
  plannerReasoningThinkingNode,
} from './nodes';

/**
 * Conditional edge from generate-plan-context-action:
 *   - complete_planning tool call → generate-plan
 *   - grep / read tool call       → take-action-context
 *   - plain text (reasoning)      → reasoning-thinking
 */
function routeAfterContextAction(state: PlannerState): string {
  const lastMessage = [...state.messages].reverse().find((m) => m.getType() === 'ai') as
    | AIMessage
    | undefined;

  if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
    const toolName = lastMessage.tool_calls[0].name;
    if (toolName === 'complete_planning') {
      console.log('  → routing to generate-plan (complete_planning called)');
      return 'generate-plan';
    }
    console.log(`  → routing to take-action-context (tool: ${toolName})`);
    return 'take-action-context';
  }

  // No tool call — model is reasoning/thinking
  console.log('  → routing to reasoning-thinking');
  return 'reasoning-thinking';
}

const workflow = new StateGraph(PlannerStateAnnotation)
  .addNode('generate-plan-context-action', generatePlanContextActionNode)
  .addNode('take-action-context', takeActionContextNode)
  .addNode('reasoning-thinking', plannerReasoningThinkingNode)
  .addNode('generate-plan', generatePlanNode)
  .addNode('generate-notes', notesNode)
  // ── edges ──
  .addEdge(START, 'generate-plan-context-action')
  .addConditionalEdges('generate-plan-context-action', routeAfterContextAction, {
    'take-action-context': 'take-action-context',
    'generate-plan': 'generate-plan',
    'reasoning-thinking': 'reasoning-thinking',
  })
  // After executing a tool, loop back to gather more context
  .addEdge('take-action-context', 'generate-plan-context-action')
  // After reasoning, loop back to generate-plan-context-action
  .addEdge('reasoning-thinking', 'generate-plan-context-action')
  // After plan is ready, create notes then finish
  .addEdge('generate-plan', 'generate-notes')
  .addEdge('generate-notes', END);

export const plannerGraph = workflow.compile();
plannerGraph.name = 'Planner Agent — Context → Plan → Notes';
