import path from "path";
import { AgentState, CodeStep } from "../types";
import { CODING_AGENT_PROMPT } from "../prompts";
import {
  createLLM,
  invokeLLMWithJSON,
  readJsonFile,
  readTextFile,
  writeFile,
  fileExists,
  formatFilesForContext,
  truncateContent,
} from "../functions";

interface CodingAgentOutput {
  fileContent: string;
}

/**
 * Coding Agent Node
 * 
 * This agent executes each step in the plan sequentially.
 * For each step, it:
 * 1. Reads the target file
 * 2. Sends the file and context to LLM
 * 3. Receives the complete new file content
 * 4. Writes the file to disk
 * 5. Updates the working tree for future context
 */
export async function codingAgent(state: AgentState): Promise<Partial<AgentState>> {
  console.log("💻 Running Coding Agent...");

  const workingTree = { ...state.workingTree };
  const codeSteps = [...(state.codeSteps || [])];

  try {
    // Read repo map and file index for context
    const repoMap = await readJsonFile(state.repoMapPath);
    const fileIndex = await readJsonFile(state.fileIndexPath);

    // Execute each step sequentially
    for (const step of codeSteps) {
      if (step.completed) {
        console.log(`⏭️  Skipping completed step ${step.step}`);
        continue;
      }

      console.log(`\n🔨 Executing Step ${step.step}: ${step.filePath}`);

      // Read the current file content
      const fullFilePath = path.join(state.repoPath, step.filePath);
      let currentFileContent = "";
      
      if (await fileExists(fullFilePath)) {
        currentFileContent = await readTextFile(fullFilePath);
      } else {
        console.log(`  ℹ️  File does not exist yet, will create new file`);
      }

      // Create the user message with all context
      const userMessage = `
Issue/Task:
${state.issue}

Current Step ${step.step}:
${step.description}

Target File Path:
${step.filePath}

Current File Content:
${currentFileContent || "// New file - no existing content"}

${formatFilesForContext(workingTree, "Working Tree (Previously Modified Files)")}

Repository Map (truncated):
${truncateContent(JSON.stringify(repoMap, null, 2), 2000)}

File Index (truncated):
${truncateContent(JSON.stringify(fileIndex, null, 2), 2000)}

Please generate the COMPLETE new file content for ${step.filePath}.
`;

      // Invoke LLM
      const llm = createLLM();
      const result = await invokeLLMWithJSON<CodingAgentOutput>(
        llm,
        CODING_AGENT_PROMPT,
        userMessage
      );

      // Write the new file content
      await writeFile(fullFilePath, result.fileContent);
      console.log(`  ✅ Successfully wrote ${step.filePath}`);

      // Update working tree
      workingTree[step.filePath] = result.fileContent;

      // Mark step as completed
      const stepIndex = codeSteps.findIndex((s) => s.step === step.step);
      if (stepIndex !== -1) {
        codeSteps[stepIndex].completed = true;
      }
    }

    console.log("\n✅ All coding steps completed!");

    return {
      workingTree,
      codeSteps,
    };
  } catch (error) {
    console.error("❌ Error in coding agent:", error);
    throw error;
  }
}
