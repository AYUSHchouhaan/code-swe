import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/list-repos
 * Lists all downloaded repositories in public/downloads
 */
export async function GET() {
  try {
    const downloadsPath = path.join(process.cwd(), 'public', 'downloads');

    if (!fs.existsSync(downloadsPath)) {
      return NextResponse.json({
        success: true,
        repos: [],
      });
    }

    const items = fs.readdirSync(downloadsPath);
    
    // Filter only directories
    const repos = items.filter(item => {
      const itemPath = path.join(downloadsPath, item);
      return fs.statSync(itemPath).isDirectory();
    }).map(repoName => {
      const repoPath = path.join(downloadsPath, repoName);
      const indexPath = path.join(repoPath, '.codebase-index', 'index.json');
      const architecturePath = path.join(repoPath, '.codebase-index', 'architecture.json');
      const hasIndex = fs.existsSync(indexPath);
      const hasMapped = fs.existsSync(architecturePath);
      
      let indexedFiles = 0;
      if (hasIndex) {
        try {
          const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
          indexedFiles = Array.isArray(indexData) ? indexData.length : 0;
        } catch (error) {
          console.error(`Error reading index for ${repoName}:`, error);
        }
      }

      return {
        name: repoName,
        hasIndex,
        indexedFiles,
        hasMapped,
      };
    });

    return NextResponse.json({
      success: true,
      repos,
    });

  } catch (error) {
    console.error('Error listing repos:', error);
    return NextResponse.json(
      { error: 'Failed to list repositories', details: String(error) },
      { status: 500 }
    );
  }
}
