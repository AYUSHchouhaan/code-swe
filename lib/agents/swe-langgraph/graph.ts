import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentStateAnnotation, AgentState } from "./types";
import { 
  queryBreakdownNode, 
  searchAgentNode, 
  planningAgentNode, 
  codingAgentNode 
} from "./nodes";

/**
 * SWE LangGraph Agent
 * 
 * A multi-agent system for automated software engineering tasks:
 * 1. Query Breakdown: Breaks user query into focused subqueries
 * 2. Search Agent: Finds relevant files using index and map
 * 3. Planning Agent: Creates step-by-step implementation plan
 * 4. Coding Agent: Executes steps one at a time (loops until done)
 * 
 * Flow:
 * START -> Query Breakdown -> Search -> Planning -> Coding -> (loop back to Coding OR END)
 */

// Conditional edge function for coding node
function shouldContinueCoding(state: AgentState): string {
  if (state.completed) {
    console.log('\n✅ All steps completed!');
    return END;
  }
  console.log(`\nContinuing to next step (${state.currentStep + 1}/${state.planSteps.length})...`);
  return 'coding-agent';
}

const workflow = new StateGraph(AgentStateAnnotation)
  .addNode("query-breakdown", queryBreakdownNode)
  .addNode("search-agent", searchAgentNode)
  .addNode("planning-agent", planningAgentNode)
  .addNode("coding-agent", codingAgentNode)
  .addEdge(START, "query-breakdown")
  .addEdge("query-breakdown", "search-agent")
  .addEdge("search-agent", "planning-agent")
  .addEdge("planning-agent", "coding-agent")
  .addConditionalEdges("coding-agent", shouldContinueCoding);

export const graph = workflow.compile();
graph.name = "SWE Agent - Query, Search, Plan, Code";

