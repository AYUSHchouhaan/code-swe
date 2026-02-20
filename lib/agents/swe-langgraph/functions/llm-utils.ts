import { ChatOllama } from "@langchain/ollama";

/**
 * Create an Ollama LLM instance
 */
export function createLLM(model: string = "llama3.1", temperature: number = 0.7) {
  return new ChatOllama({
    model,
    temperature,
    baseUrl: "http://localhost:11434",
  });
}

/**
 * Invoke LLM with a prompt and parse JSON response
 */
export async function invokeLLMWithJSON<T = any>(
  llm: ChatOllama,
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const response = await llm.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ]);

  const content = response.content.toString();
  
  // Try to extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in LLM response");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Format file contents for LLM context
 */
export function formatFilesForContext(
  files: Record<string, string>,
  label: string = "Files"
): string {
  let formatted = `${label}:\n\n`;
  
  for (const [filePath, content] of Object.entries(files)) {
    formatted += `=== ${filePath} ===\n${content}\n\n`;
  }
  
  return formatted;
}

/**
 * Truncate content if too long
 */
export function truncateContent(content: string, maxLength: number = 10000): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  const half = Math.floor(maxLength / 2);
  return `${content.slice(0, half)}\n\n... [truncated ${content.length - maxLength} characters] ...\n\n${content.slice(-half)}`;
}
