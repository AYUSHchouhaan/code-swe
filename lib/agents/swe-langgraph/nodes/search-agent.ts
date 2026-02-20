import { AgentState } from "../types";
import { SEARCH_AGENT_PROMPT } from "../prompts";
import {
  createLLM,
  invokeLLMWithJSON,
  readJsonFile,
  truncateContent,
} from "../functions";

interface SearchAgentOutput {
  searchQueries: string[];
  relevantFiles: string[];
}

/**
 * Search Agent Node
 * 
 * This agent analyzes the issue and identifies relevant files in the codebase.
 * It breaks down the issue into search queries and uses the file index and repo map
 * to determine which files are most relevant to solving the issue.
 */
export async function searchAgent(state: AgentState): Promise<Partial<AgentState>> {
  console.log("🔍 Running Search Agent...");

  try {
    // Read the file index and repo map
    const fileIndex = await readJsonFile(state.fileIndexPath);
    const repoMap = await readJsonFile(state.repoMapPath);

    // Create the user message with context
    const userMessage = `
Issue/Task:
${state.issue}

File Index (truncated):
${truncateContent(JSON.stringify(fileIndex, null, 2), 5000)}

Repository Map:
${truncateContent(JSON.stringify(repoMap, null, 2), 3000)}

Please analyze this issue and provide:
1. Multiple search queries to help find relevant code
2. List of relevant file paths that should be examined to solve this issue
`;

    // Invoke LLM
    const llm = createLLM();
    const result = await invokeLLMWithJSON<SearchAgentOutput>(
      llm,
      SEARCH_AGENT_PROMPT,
      userMessage
    );

    console.log(`✅ Found ${result.relevantFiles.length} relevant files`);
    console.log(`📝 Generated ${result.searchQueries.length} search queries`);

    return {
      searchQueries: result.searchQueries,
      relevantFiles: result.relevantFiles,
    };
  } catch (error) {
    console.error("❌ Error in search agent:", error);
    throw error;
  }
}
