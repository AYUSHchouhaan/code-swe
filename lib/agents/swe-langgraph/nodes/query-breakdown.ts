import { ChatOllama } from '@langchain/ollama';
import { z } from 'zod';
import type { AgentState } from '../types';

/**
 * Node 1: Query Breakdown
 * Takes user query and breaks it down into 3-4 subqueries for better search
 */
export async function queryBreakdownNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('\n=== NODE 1: Query Breakdown ===');
  console.log('User Query:', state.query);

  // Create Ollama LLM instance
  const llm = new ChatOllama({
    model: 'llama3.2',
    temperature: 0.3,
    baseUrl: 'http://localhost:11434',
    format: 'json',
  });

  // Define Zod schema for subqueries
  const subqueriesSchema = z.object({
    subqueries: z.array(z.string()).min(3).max(4).describe('3-4 focused search queries derived from the user query'),
  });

  // Create structured LLM
  const structuredLlm = llm.withStructuredOutput(subqueriesSchema);

  const systemPrompt = `You are an expert at breaking down software engineering queries into focused search queries.

Given a user's request or issue, break it down into 3-4 specific, focused subqueries that will help search through a codebase effectively.

Each subquery should target:
- Specific files, functions, or modules
- Particular features or functionality
- Related code patterns or dependencies
- API endpoints or database models

Make the subqueries concrete and searchable.`;

  const userMessage = `User Query: ${state.query}

Break this down into 3-4 focused search queries to find relevant code in the repository.`;

  // Invoke LLM
  const result = await structuredLlm.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]);

  console.log('Generated Subqueries:');
  result.subqueries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

  return {
    subqueries: result.subqueries,
  };
}
