import { END, START, StateGraph } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { PlannerStateAnnotation, PlannerState } from './types';
import {
  generatePlanContextActionNode,
  takeActionContextNode,
  generatePlanNode,
  notesNode,
} from './nodes';

/**
 * Conditional edge from generate-plan-context-action:
 * - If the last AI message has tool calls → execute tools (take-action-context)
 * - Otherwise → create plan (generate-plan)
 */
function routeAfterContextAction(state: PlannerState): string {
  const lastMessage = [...state.messages].reverse().find((m) => m.getType() === 'ai') as
    | AIMessage
    | undefined;

  if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
    console.log('  → routing to take-action-context');
    return 'take-action-context';
  }
  console.log('  → routing to generate-plan');
  return 'generate-plan';
}

const workflow = new StateGraph(PlannerStateAnnotation)
  .addNode('generate-plan-context-action', generatePlanContextActionNode)
  .addNode('take-action-context', takeActionContextNode)
  .addNode('generate-plan', generatePlanNode)
  .addNode('generate-notes', notesNode)
  // ── edges ──
  .addEdge(START, 'generate-plan-context-action')
  .addConditionalEdges('generate-plan-context-action', routeAfterContextAction, {
    'take-action-context': 'take-action-context',
    'generate-plan': 'generate-plan',
  })
  // After executing tools, loop back to gather more context
  .addEdge('take-action-context', 'generate-plan-context-action')
  // After plan is ready, create notes then finish
  .addEdge('generate-plan', 'generate-notes')
  .addEdge('generate-notes', END);

export const plannerGraph = workflow.compile();
plannerGraph.name = 'Planner Agent — Context → Plan → Notes';
