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
    const repos = items
      .filter(item => fs.statSync(path.join(downloadsPath, item)).isDirectory())
      .map(name => ({ name }));

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
