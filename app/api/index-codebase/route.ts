import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SYSTEM_PROMPT = `You are a senior software engineer and codebase documentation generator.

Your job is to analyze ONE source code file and generate structured metadata
that will later be used by an AI agent to understand and modify the repository.

You MUST output STRICT JSON only. No explanations. No markdown.

The goal is to help an AI agent:
- understand what the file does
- understand how it connects to other files
- know where new features or bug fixes should be added

If information is not present, return empty arrays or null.

--------------------------------
OUTPUT JSON SCHEMA:

{
  "path": string,
  "type": "api-route" | "react-component" | "db-model" | "utility" | "middleware" | "config" | "test" | "service" | "unknown",
  "summary": string,
  "imports": string[],
  "functions": [
    {
      "name": string,
      "description": string
    }
  ],
  "exports": string[],
  "routes": string[],
  "dbModels": string[],
  "keywords": string[]
}

--------------------------------
INSTRUCTIONS:

1. "summary"
   Write ONE concise sentence explaining the purpose of the file.

2. "type"
   Classify file role:
   - API route / controller → api-route
   - React component → react-component
   - Prisma/Mongoose schema → db-model
   - Helper functions → utility
   - Express/Next middleware → middleware
   - Config files → config
   - Test files → test
   - Business logic/services → service
   - Otherwise → unknown

3. "imports"
   Extract local imports only (ignore node_modules).

4. "functions"
   List main functions and describe what they do in plain English.

5. "routes"
   If HTTP routes exist, extract them.
   Example: "POST /api/login"

6. "dbModels"
   Detect database models used (User, Post, etc.)

7. "keywords"
   Add 5–10 important technical keywords.

--------------------------------
EXAMPLE OUTPUT:

{
  "path": "src/auth/login.ts",
  "type": "api-route",
  "summary": "Handles user login and JWT generation.",
  "imports": ["../db/userModel","../utils/hash"],
  "functions": [
    {
      "name": "loginUser",
      "description": "Validates credentials and returns a JWT token."
    }
  ],
  "exports": ["loginUser"],
  "routes": ["POST /api/login"],
  "dbModels": ["User"],
  "keywords": ["auth","login","jwt","password","authentication"]
}`;

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

interface FileMetadata {
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

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath: string, basePath: string, arrayOfFiles: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      const relativePath = path.relative(basePath, filePath);

      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some(pattern => 
        relativePath.includes(pattern) || file === pattern
      )) {
        return;
      }

      if (fs.statSync(filePath).isDirectory()) {
        arrayOfFiles = getAllFiles(filePath, basePath, arrayOfFiles);
      } else {
        const ext = path.extname(file);
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          arrayOfFiles.push(filePath);
        }
      }
    });

    return arrayOfFiles;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return arrayOfFiles;
  }
}

/**
 * Call Ollama API to analyze a file
 */
async function analyzeFileWithOllama(
  filePath: string,
  fileContent: string,
  model: string = 'llama3.2'
): Promise<FileMetadata | null> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: `${SYSTEM_PROMPT}\n\n---FILE PATH: ${filePath}---\n\n${fileContent}`,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.response);
    
    return result as FileMetadata;
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error);
    return null;
  }
}

/**
 * Process files in batches
 */
async function processBatch(
  files: string[],
  basePath: string,
  model: string
): Promise<FileMetadata[]> {
  const results: FileMetadata[] = [];

  for (const file of files) {
    try {
      const fileContent = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(basePath, file).replace(/\\/g, '/');
      
      const metadata = await analyzeFileWithOllama(relativePath, fileContent, model);
      
      if (metadata) {
        results.push(metadata);
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error);
    }
  }

  return results;
}

/**
 * POST /api/index-codebase
 * Request body: { repoName: string, batchSize?: number, model?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoName, batchSize = 5, model = 'llama3.2' } = body;

    if (!repoName) {
      return NextResponse.json(
        { error: 'repoName is required' },
        { status: 400 }
      );
    }

    const repoPath = path.join(process.cwd(), 'public', 'downloads', repoName);

    if (!fs.existsSync(repoPath)) {
      return NextResponse.json(
        { error: `Repository not found: ${repoName}` },
        { status: 404 }
      );
    }

    // Get all files
    const allFiles = getAllFiles(repoPath, repoPath);

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: 'No supported files found in the repository' },
        { status: 404 }
      );
    }

    // Process files in batches
    const allMetadata: FileMetadata[] = [];
    const totalBatches = Math.ceil(allFiles.length / batchSize);

    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      
      console.log(`Processing batch ${currentBatch}/${totalBatches}...`);
      
      const batchResults = await processBatch(batch, repoPath, model);
      allMetadata.push(...batchResults);
    }

    // Save metadata to a JSON file
    const outputDir = path.join(repoPath, '.codebase-index');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'index.json');
    fs.writeFileSync(outputPath, JSON.stringify(allMetadata, null, 2));

    return NextResponse.json({
      success: true,
      totalFiles: allFiles.length,
      indexedFiles: allMetadata.length,
      outputPath: path.relative(process.cwd(), outputPath).replace(/\\/g, '/'),
      metadata: allMetadata,
    });

  } catch (error) {
    console.error('Error indexing codebase:', error);
    return NextResponse.json(
      { error: 'Failed to index codebase', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/index-codebase?repoName=xxx
 * Retrieve existing index for a repository
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoName = searchParams.get('repoName');

    if (!repoName) {
      return NextResponse.json(
        { error: 'repoName query parameter is required' },
        { status: 400 }
      );
    }

    const indexPath = path.join(
      process.cwd(),
      'public',
      'downloads',
      repoName,
      '.codebase-index',
      'index.json'
    );

    if (!fs.existsSync(indexPath)) {
      return NextResponse.json(
        { error: 'Index not found. Please run POST /api/index-codebase first.' },
        { status: 404 }
      );
    }

    const metadata = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

    return NextResponse.json({
      success: true,
      repoName,
      totalFiles: metadata.length,
      metadata,
    });

  } catch (error) {
    console.error('Error retrieving index:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve index', details: String(error) },
      { status: 500 }
    );
  }
}
