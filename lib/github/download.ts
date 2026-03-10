import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import extract from "extract-zip";

export interface DownloadRepoOptions {
  owner: string;
  repo: string;
  branch?: string;
  ref?: string; // commit SHA, tag, or branch
  token: string;
  destinationPath: string;
}

export interface DownloadResult {
  success: boolean;
  path: string;
  message?: string;
}

/**
 * Downloads a GitHub repository using the GitHub API
 * This method works on any server without git installed
 */
export async function downloadRepository(
  options: DownloadRepoOptions
): Promise<DownloadResult> {


  const {owner, repo, branch, ref, token, destinationPath} = options;

  // Determine the ref to download (priority: ref > branch > default)
  // Filter out empty strings
  const downloadRef = ref?.trim() || branch?.trim() ;

  // Construct the API URL for zip download
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${downloadRef}`;

  // Use a temporary directory for the entire operation
  const tempDir = path.join(path.dirname(destinationPath), `_temp_${Date.now()}`);
  
  try {
    console.log(`[Download] Starting download from: ${apiUrl}`);
    
    // Create temporary directory
    await fs.promises.mkdir(tempDir, { recursive: true });
    console.log(`[Download] Created temp directory: ${tempDir}`);

    // Download the archive
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GitHub-Repo-Downloader",
      },
      redirect: "follow", // GitHub will redirect to the actual archive URL
    });

    console.log(`[Download] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      const errorMessage = `Failed to download repository: ${response.status} ${response.statusText} - ${errorText}`;
      console.error(`[Download] Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Save the archive to a temporary file
    const tempArchivePath = path.join(tempDir, "repo.zip");

    // Stream the response to file
    if (response.body) {
      console.log(`[Download] Streaming to temp file: ${tempArchivePath}`);
      const fileStream = createWriteStream(tempArchivePath);
      await pipeline(Readable.fromWeb(response.body as any), fileStream);
      console.log(`[Download] Archive saved successfully`);
    } else {
      throw new Error("Response body is null");
    }

    // Extract the archive
    console.log(`[Download] Starting extraction...`);
    await extractZipArchive(tempArchivePath, tempDir);
    console.log(`[Download] Extraction completed`);

    // Find the extracted directory (GitHub creates a single top-level directory)
    const extractedItems = await fs.promises.readdir(tempDir);
    const repoFolder = extractedItems.find(item => item !== 'repo.zip');
    
    if (!repoFolder) {
      throw new Error('No extracted folder found');
    }

    const extractedRepoPath = path.join(tempDir, repoFolder);
    console.log(`[Download] Found extracted folder: ${repoFolder}`);

    // Create parent directory for destination
    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
    
    // Move the extracted folder to the final destination
    await fs.promises.rename(extractedRepoPath, destinationPath);
    console.log(`[Download] Moved to destination: ${destinationPath}`);

    // Clean up temp directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    console.log(`[Download] Cleaned up temp directory`);

    return {
      success: true,
      path: destinationPath,
      message: `Repository ${owner}/${repo} downloaded successfully`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`[Download] Failed:`, error);
    console.error(`[Download] Error message: ${errorMessage}`);
    
    // Clean up temp directory on error
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error(`[Download] Failed to cleanup temp directory:`, cleanupError);
    }
    
    return {
      success: false,
      path: destinationPath,
      message: errorMessage,
    };
  }
}

/**
 * Extract ZIP archive directly to destination
 */
async function extractZipArchive(
  archivePath: string,
  destinationPath: string
): Promise<void> {
  try {
    console.log(`[Extract] Extracting zip to: ${destinationPath}`);
    await extract(archivePath, { dir: path.resolve(destinationPath) });
    console.log(`[Extract] Extraction completed`);
  } catch (error) {
    console.error(`[Extract] Extraction failed:`, error);
    throw error;
  }
}

