import { ChatOllama } from '@langchain/ollama';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import type { AgentState } from '../types';

/**
 * Node 4: Coding Agent
 * Executes one step at a time - opens file, sends to LLM, gets full file back, replaces it
 */
export async function codingAgentNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('\n=== NODE 4: Coding Agent ===');

  const currentStepIndex = state.currentStep;
  const step = state.planSteps[currentStepIndex];

  if (!step) {
    console.log('No more steps to execute. Marking as completed.');
    return {
      completed: true,
    };
  }

  console.log(`Executing Step ${step.stepNumber}: ${step.description}`);
  console.log(`Action: ${step.action} | File: ${step.filePath}`);

  // Get current file content from state (NOT from disk)
  let currentContent = '';
  
  if (step.action === 'create') {
    currentContent = '// New file - no existing content';
  } else {
    // Check working tree first (modified files), then fileContents (original files)
    currentContent = state.workingTree[step.filePath] || state.fileContents[step.filePath] || '';
  }

  console.log('Using content from state:', currentContent ? `${currentContent.length} characters` : 'empty');

  // Create Ollama LLM instance
  const llm = new ChatOllama({
    model: 'llama3.2',
    temperature: 0.3,
    baseUrl: 'http://localhost:11434',
    format: 'json',
  });

  // Define Zod schema for file generation
  const fileOutputSchema = z.object({
    fileContent: z.string().describe('The complete new file content'),
    summary: z.string().describe('Brief summary of changes made'),
  });

  // Create structured LLM
  const structuredLlm = llm.withStructuredOutput(fileOutputSchema);

  const systemPrompt = `You are an expert software engineer implementing code changes.

Given a step description and current file content, generate the COMPLETE new file content.

Rules:
1. Return the ENTIRE file content, not just changes
2. Maintain code style and conventions
3. Add proper imports if needed
4. Ensure syntactic correctness
5. Follow best practices`;

  const userMessage = `User Query: ${state.query}

Step ${step.stepNumber}: ${step.description}
Action: ${step.action}
File: ${step.filePath}

Current File Content:
${currentContent || '// New file - no existing content'}

Full Plan Context:
${state.planSteps.map(s => `${s.stepNumber}. ${s.description} (${s.filePath})`).join('\n')}

Working Tree (recently modified files):
${JSON.stringify(state.workingTree, null, 2)}

Generate the complete new file content for ${step.filePath}.`;

  // Invoke LLM
  const result = await structuredLlm.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]);

  console.log('Change Summary:', result.summary);

  // Write the file to disk
  const fullPath = path.join(state.repoPath, step.filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, result.fileContent, 'utf-8');
  console.log(`✓ Wrote file: ${step.filePath}`);

  // Update state
  const updatedSteps = [...state.planSteps];
  updatedSteps[currentStepIndex] = { ...step, completed: true };

  const updatedWorkingTree = {
    ...state.workingTree,
    [step.filePath]: result.fileContent,
  };

  const nextStep = currentStepIndex + 1;
  const isCompleted = nextStep >= state.planSteps.length;

  return {
    planSteps: updatedSteps,
    workingTree: updatedWorkingTree,
    currentStep: nextStep,
    completed: isCompleted,
  };
}
