import fs from 'fs';
import path from 'path';

// Files and directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'README.md',
  'readme.md',
  'README',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'requirements.txt',
  'setup.py',
  'Pipfile',
  'Pipfile.lock',
  'poetry.lock',
];

// Supported file extensions for analysis
const SUPPORTED_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.py',
  '.java', '.kt',
  '.c', '.cpp', '.h', '.hpp',
];

export interface FileMetadata {
  path: string;
  type: string;
  summary: string;
  imports: string[];
  functions: Array<{ name: string; description: string }>;
  exports: string[];
  routes: string[];
  dbModels: string[];
  keywords: string[];
}

export interface BatchResult {
  [filePath: string]: Omit<FileMetadata, 'path'>;
}

/**
 * Recursively get all files in a directory (without filtering)
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      const filePath = path.join(dirPath, file);

      if (fs.statSync(filePath).isDirectory()) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      } else {
        arrayOfFiles.push(filePath);
      }
    });

    return arrayOfFiles;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return arrayOfFiles;
  }
}

/**
 * Check if a file should be excluded based on patterns
 */
function shouldExcludeFile(filePath: string, basePath: string): boolean {
  const relativePath = path.relative(basePath, filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);

  // Check exclude patterns
  if (EXCLUDE_PATTERNS.some(pattern => 
    relativePath.includes(pattern) || fileName === pattern
  )) {
    return true;
  }

  // Check if extension is supported
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return true;
  }

  return false;
}

/**
 * Call Ollama API to analyze multiple files with structured output
 */
async function analyzeFilesWithOllama(
  filesData: { path: string; content: string }[],
  systemPrompt: string,
  model: string = 'llama3.2'
): Promise<BatchResult | null> {
  try {
    // Create the prompt with all files
    const filesJson = filesData.map(f => ({
      path: f.path,
      content: f.content
    }));

    const prompt = `${systemPrompt}\n\n---FILES TO ANALYZE---\n\n${JSON.stringify(filesJson, null, 2)}\n\n---END OF FILES---\n\nNow analyze ALL the files above and return a JSON object where each key is a file path and each value is the metadata object for that file.`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.response);
    
    return result as BatchResult;
  } catch (error) {
    console.error('Error analyzing files with Ollama:', error);
    return null;
  }
}

/**
 * Process a batch of 5 files: filter by exclude patterns, read content, send to LLM
 */
async function processBatch(
  files: string[],
  basePath: string,
  systemPrompt: string,
  model: string
): Promise<BatchResult> {
  // Filter files by exclude patterns and supported extensions
  const validFiles = files.filter(file => !shouldExcludeFile(file, basePath));

  if (validFiles.length === 0) {
    console.log('No valid files in this batch after filtering');
    return {};
  }

  // Read file contents and prepare JSON
  const filesData = validFiles.map(file => {
    try {
      const fileContent = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(basePath, file).replace(/\\/g, '/');
      return { path: relativePath, content: fileContent };
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
      return null;
    }
  }).filter(Boolean) as { path: string; content: string }[];

  if (filesData.length === 0) {
    console.log('No files could be read in this batch');
    return {};
  }

  console.log(`Sending ${filesData.length} files to LLM...`);
  
  // Send to LLM
  const result = await analyzeFilesWithOllama(filesData, systemPrompt, model);
  return result || {};
}

/**
 * Index a codebase by analyzing files in batches
 */
export async function indexCodebase(
  repoPath: string,
  systemPrompt: string,
  model: string = 'llama3.2',
  batchSize: number = 5
): Promise<{
  success: boolean;
  totalFiles: number;
  indexedFiles: number;
  outputPath: string;
  metadata: BatchResult;
}> {
  // Step 1: Get all files in the repository
  console.log('Step 1: Getting all files from repository...');
  const allFiles = getAllFiles(repoPath);
  console.log(`Found ${allFiles.length} total files`);

  if (allFiles.length === 0) {
    throw new Error('No files found in the repository');
  }

  // Prepare output directory and file
  const outputDir = path.join(repoPath, '.codebase-index');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'index.json');

  // Check if index already exists and load it
  let allMetadata: BatchResult = {};
  if (fs.existsSync(outputPath)) {
    try {
      allMetadata = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      console.log(`Loaded existing index with ${Object.keys(allMetadata).length} files`);
    } catch (error) {
      console.warn('Could not read existing index, starting fresh');
    }
  }

  // Step 2: Process files in batches of 5
  const totalBatches = Math.ceil(allFiles.length / batchSize);
  console.log(`\nStep 2: Processing ${allFiles.length} files in ${totalBatches} batches...`);

  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    const currentBatch = Math.floor(i / batchSize) + 1;
    
    console.log(`\n--- Batch ${currentBatch}/${totalBatches} ---`);
    console.log(`Processing files ${i + 1} to ${Math.min(i + batchSize, allFiles.length)}...`);
    
    // Process batch: filter, read, send to LLM
    const batchResults = await processBatch(batch, repoPath, systemPrompt, model);
    
    // Step 3: Append results to index.json
    if (Object.keys(batchResults).length > 0) {
      allMetadata = { ...allMetadata, ...batchResults };
      fs.writeFileSync(outputPath, JSON.stringify(allMetadata, null, 2));
      console.log(`✓ Appended ${Object.keys(batchResults).length} files to index.json`);
      console.log(`Total indexed so far: ${Object.keys(allMetadata).length} files`);
    }
  }

  console.log(`\n✓ Indexing complete! Total files indexed: ${Object.keys(allMetadata).length}`);

  return {
    success: true,
    totalFiles: allFiles.length,
    indexedFiles: Object.keys(allMetadata).length,
    outputPath: path.relative(process.cwd(), outputPath).replace(/\\/g, '/'),
    metadata: allMetadata,
  };
}

/**
 * Get existing index for a repository
 */
export function getIndex(repoPath: string): BatchResult {
  const indexPath = path.join(repoPath, '.codebase-index', 'index.json');

  if (!fs.existsSync(indexPath)) {
    throw new Error('Index not found. Please run indexing first.');
  }

  return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
}
