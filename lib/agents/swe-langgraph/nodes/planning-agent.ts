import { AgentState, CodeStep } from "../types";
import { PLANNING_AGENT_PROMPT } from "../prompts";
import {
  createLLM,
  invokeLLMWithJSON,
  readJsonFile,
  readMultipleFiles,
  formatFilesForContext,
  truncateContent,
} from "../functions";

interface PlanningAgentOutput {
  plan: string[];
  codeSteps: CodeStep[];
}

/**
 * Planning Agent Node
 * 
 * This agent creates a step-by-step implementation plan based on the relevant files.
 * Each step in the plan modifies exactly ONE file, ensuring sequential and manageable changes.
 */
export async function planningAgent(state: AgentState): Promise<Partial<AgentState>> {
  console.log("📋 Running Planning Agent...");

  try {
    // Read relevant files
    const relevantFileContents = await readMultipleFiles(
      state.repoPath,
      state.relevantFiles || []
    );

    // Read file index and repo map for additional context
    const fileIndex = await readJsonFile(state.fileIndexPath);
    const repoMap = await readJsonFile(state.repoMapPath);

    // Create the user message with all context
    const userMessage = `
Issue/Task:
${state.issue}

${formatFilesForContext(relevantFileContents, "Relevant Files")}

File Index (truncated):
${truncateContent(JSON.stringify(fileIndex, null, 2), 3000)}

Repository Map:
${truncateContent(JSON.stringify(repoMap, null, 2), 2000)}

Please create a detailed step-by-step plan to solve this issue.
Remember: EACH STEP must modify EXACTLY ONE FILE.
`;

    // Invoke LLM
    const llm = createLLM();
    const result = await invokeLLMWithJSON<PlanningAgentOutput>(
      llm,
      PLANNING_AGENT_PROMPT,
      userMessage
    );

    console.log(`✅ Created plan with ${result.codeSteps.length} steps`);
    result.codeSteps.forEach((step) => {
      console.log(`  Step ${step.step}: ${step.filePath}`);
    });

    return {
      plan: result.plan,
      codeSteps: result.codeSteps,
    };
  } catch (error) {
    console.error("❌ Error in planning agent:", error);
    throw error;
  }
}
