import { END, START, StateGraph } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { ProgrammerStateAnnotation, ProgrammerState } from './types';
import {
  generateActionNode,
  takeActionNode,
  completeTaskNode,
  endConclusionNode,
} from './nodes';

/**
 * Conditional edge from generate-action:
 * - If tool call → take-action
 * - If no tool call → complete-task
 */
function routeAfterGenerateAction(state: ProgrammerState): string {
  const lastAI = [...state.messages].reverse().find((m) => m.getType() === 'ai') as
    | AIMessage
    | undefined;

  if (lastAI?.tool_calls && lastAI.tool_calls.length > 0) {
    console.log('  → routing to take-action');
    return 'take-action';
  }
  console.log('  → routing to complete-task');
  return 'complete-task';
}

/**
 * Conditional edge from complete-task:
 * - If there are still incomplete tasks → generate-action
 * - If all tasks done → end-conclusion
 */
function routeAfterCompleteTask(state: ProgrammerState): string {
  const hasIncomplete = state.plan.some((t) => !t.completed);
  if (hasIncomplete) {
    console.log('  → more tasks remaining, back to generate-action');
    return 'generate-action';
  }
  console.log('  → all tasks done, going to end-conclusion');
  return 'end-conclusion';
}

const workflow = new StateGraph(ProgrammerStateAnnotation)
  .addNode('generate-action', generateActionNode)
  .addNode('take-action', takeActionNode)
  .addNode('complete-task', completeTaskNode)
  .addNode('end-conclusion', endConclusionNode)
  // ── edges ──
  .addEdge(START, 'generate-action')
  .addConditionalEdges('generate-action', routeAfterGenerateAction, {
    'take-action': 'take-action',
    'complete-task': 'complete-task',
  })
  // After executing tool, loop back to generate-action
  .addEdge('take-action', 'generate-action')
  // After completing a task, check if more remain
  .addConditionalEdges('complete-task', routeAfterCompleteTask, {
    'generate-action': 'generate-action',
    'end-conclusion': 'end-conclusion',
  })
  .addEdge('end-conclusion', END);

export const programmerGraph = workflow.compile();
programmerGraph.name = 'Programmer Agent — Execute Tasks';
