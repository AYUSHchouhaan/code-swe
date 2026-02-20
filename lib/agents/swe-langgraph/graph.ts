import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentStateAnnotation } from "./types";
import { searchAgent, planningAgent, codingAgent } from "./nodes";

/**
 * SWE LangGraph Agent
 * 
 * A multi-agent system for automated software engineering tasks:
 * 1. Search Agent: Finds relevant files in the codebase
 * 2. Planning Agent: Creates a step-by-step implementation plan
 * 3. Coding Agent: Executes the plan and generates code changes
 * 
 * Flow:
 * START -> Search Agent -> Planning Agent -> Coding Agent -> END
 */

const workflow = new StateGraph(AgentStateAnnotation)
  .addNode("search-agent", searchAgent)
  .addNode("planning-agent", planningAgent)
  .addNode("coding-agent", codingAgent)
  .addEdge(START, "search-agent")
  .addEdge("search-agent", "planning-agent")
  .addEdge("planning-agent", "coding-agent")
  .addEdge("coding-agent", END);

export const graph = workflow.compile();
graph.name = "SWE Agent - Search, Plan, Code";
