import { promises as fs } from 'fs';
import path from 'path';

/**
 * Read a JSON file and parse it
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Read a text file
 */
export async function readTextFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * Write content to a file
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read multiple files and return a map of path -> content
 */
export async function readMultipleFiles(
  repoPath: string,
  filePaths: string[]
): Promise<Record<string, string>> {
  const fileContents: Record<string, string> = {};

  for (const filePath of filePaths) {
    const fullPath = path.join(repoPath, filePath);
    if (await fileExists(fullPath)) {
      try {
        fileContents[filePath] = await readTextFile(fullPath);
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        fileContents[filePath] = `// Error reading file: ${error}`;
      }
    }
  }

  return fileContents;
}
