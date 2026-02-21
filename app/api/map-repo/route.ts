import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateArchitectureMap, getArchitectureMap } from '@/lib/agents/repo-mapping';

// Load the repo mapping prompt
const PROMPTS_DIR = path.join(process.cwd(), 'prompts');
const REPO_MAPPING_PROMPT = fs.readFileSync(
  path.join(PROMPTS_DIR, 'repo-mapping.txt'), 
  'utf-8'
);

/**
 * POST /api/map-repo
 * Request body: { repoName: string, model?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoName, model = 'llama3.2' } = body;

    if (!repoName) {
      return NextResponse.json(
        { error: 'repoName is required' },
        { status: 400 }
      );
    }

    const repoPath = path.join(process.cwd(), 'public', 'downloads', repoName);

    // Check if repo exists
    if (!fs.existsSync(repoPath)) {
      return NextResponse.json(
        { error: `Repository not found: ${repoName}` },
        { status: 404 }
      );
    }

    // Use the mapping agent
    const result = await generateArchitectureMap(repoPath, REPO_MAPPING_PROMPT, model);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error mapping repository:', error);
    return NextResponse.json(
      { error: 'Failed to map repository', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/map-repo?repoName=xxx
 * Retrieve existing architecture map for a repository
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

    // Use the mapping agent to get the architecture map
    const data = getArchitectureMap(repoPath);

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('Error retrieving architecture map:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve architecture map', details: String(error) },
      { status: 500 }
    );
  }
}
