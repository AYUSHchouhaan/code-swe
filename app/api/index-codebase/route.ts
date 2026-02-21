import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { indexCodebase, getIndex } from '@/lib/agents/file-indexing';

// Load the file indexing prompt from prompts folder
const PROMPTS_DIR = path.join(process.cwd(), 'prompts');
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(PROMPTS_DIR, 'file-indexing.txt'),
  'utf-8'
);

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

    // Use the indexing agent
    const result = await indexCodebase(repoPath, SYSTEM_PROMPT, model, batchSize);

    return NextResponse.json(result);

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

    const repoPath = path.join(process.cwd(), 'public', 'downloads', repoName);

    if (!fs.existsSync(repoPath)) {
      return NextResponse.json(
        { error: `Repository not found: ${repoName}` },
        { status: 404 }
      );
    }

    // Use the indexing agent to get the index
    const metadata = getIndex(repoPath);

    return NextResponse.json({
      success: true,
      repoName,
      totalFiles: Object.keys(metadata).length,
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
