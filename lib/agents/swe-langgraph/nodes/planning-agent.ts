import { ChatOllama } from '@langchain/ollama';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import type { AgentState, PlanStep } from '../types';

/**
 * Node 3: Planning Agent
 * Opens relevant files, creates file contents JSON, gets step-by-step plan from LLM
 */
export async function planningAgentNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('\n=== NODE 3: Planning Agent ===');
  console.log('Creating implementation plan...');

  // Read file contents
  const fileContents: Record<string, string> = {};
  for (const filePath of state.relevantFilePaths) {
    const fullPath = path.join(state.repoPath, filePath);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      fileContents[filePath] = content;
      console.log(`Loaded: ${filePath}`);
    } catch (error) {
      console.warn(`Could not read file: ${filePath}`);
    }
  }

  // Create Ollama LLM instance
  const llm = new ChatOllama({
    model: 'llama3.2',
    temperature: 0.3,
    baseUrl: 'http://localhost:11434',
    format: 'json',
  });

  // Define Zod schema for plan steps
  const planStepSchema = z.object({
    stepNumber: z.number(),
    description: z.string(),
    action: z.enum(['edit', 'create', 'delete']),
    filePath: z.string(),
    completed: z.boolean(),
  });

  const planSchema = z.object({
    steps: z.array(planStepSchema).describe('Step-by-step plan to implement the changes'),
    summary: z.string().describe('Brief summary of the overall approach'),
  });

  // Create structured LLM
  const structuredLlm = llm.withStructuredOutput(planSchema);

  const systemPrompt = `You are an expert software engineer creating implementation plans.

Given a user query and relevant file contents, create a detailed step-by-step plan.

Rules:
1. Each step should modify/create/delete exactly ONE file
2. Steps should be in logical order
3. Be specific about what changes to make
4. Include file path for each step
5. Mark all steps as not completed initially`;

  const userMessage = `User Query: ${state.query}

File Contents:
${JSON.stringify(fileContents, null, 2)}

Create a step-by-step implementation plan to address this query.`;

  // Invoke LLM
  const result = await structuredLlm.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]);

  console.log('Plan Summary:', result.summary);
  console.log(`Generated ${result.steps.length} steps:`);
  result.steps.forEach((step) => {
    console.log(`  ${step.stepNumber}. [${step.action}] ${step.filePath}: ${step.description}`);
  });

  return {
    fileContents,
    planSteps: result.steps,
  };
}
