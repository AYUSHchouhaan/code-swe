import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import extract from "extract-zip";
import * as tar from "tar";

export interface DownloadRepoOptions {
  owner: string;
  repo: string;
  branch?: string;
  ref?: string; // commit SHA, tag, or branch
  token: string;
  destinationPath: string;
  format?: "zip" | "tar"; // default: zip
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
  const {
    owner,
    repo,
    branch,
    ref,
    token,
    destinationPath,
    format = "zip",
  } = options;

  // Determine the ref to download (priority: ref > branch > default)
  const downloadRef = ref || branch || "HEAD";

  // Construct the API URL
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/${format === "zip" ? "zipball" : "tarball"}/${downloadRef}`;

  try {
    // Create destination directory if it doesn't exist
    await fs.promises.mkdir(destinationPath, { recursive: true });

    // Download the archive
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GitHub-Repo-Downloader",
      },
      redirect: "follow", // GitHub will redirect to the actual archive URL
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Failed to download repository: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Save the archive to a temporary file
    const tempArchivePath = path.join(
      destinationPath,
      `temp-${Date.now()}.${format === "zip" ? "zip" : "tar.gz"}`
    );

    // Stream the response to file
    if (response.body) {
      const fileStream = createWriteStream(tempArchivePath);
      await pipeline(Readable.fromWeb(response.body as any), fileStream);
    } else {
      throw new Error("Response body is null");
    }

    // Extract the archive
    if (format === "zip") {
      await extractZipArchive(tempArchivePath, destinationPath);
    } else {
      await extractTarArchive(tempArchivePath, destinationPath);
    }

    // Clean up the temporary archive
    await fs.promises.unlink(tempArchivePath);

    return {
      success: true,
      path: destinationPath,
      message: `Repository ${owner}/${repo} downloaded successfully`,
    };
  } catch (error) {
    return {
      success: false,
      path: destinationPath,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Extract ZIP archive
 */
async function extractZipArchive(
  archivePath: string,
  destinationPath: string
): Promise<void> {
  // Extract to temp location first
  const tempExtractPath = path.join(destinationPath, "_temp_extract");
  await extract(archivePath, { dir: path.resolve(tempExtractPath) });

  // GitHub archives contain a single top-level directory, move its contents up
  const extractedItems = await fs.promises.readdir(tempExtractPath);
  if (extractedItems.length === 1) {
    const topLevelDir = path.join(tempExtractPath, extractedItems[0]);
    const stat = await fs.promises.stat(topLevelDir);

    if (stat.isDirectory()) {
      // Move all contents from the top-level directory to destination
      const contents = await fs.promises.readdir(topLevelDir);
      for (const item of contents) {
        const sourcePath = path.join(topLevelDir, item);
        const destPath = path.join(destinationPath, item);
        await fs.promises.rename(sourcePath, destPath);
      }
    }
  }

  // Clean up temp directory
  await fs.promises.rm(tempExtractPath, { recursive: true, force: true });
}

/**
 * Extract TAR archive
 */
async function extractTarArchive(
  archivePath: string,
  destinationPath: string
): Promise<void> {
  // Extract to temp location first
  const tempExtractPath = path.join(destinationPath, "_temp_extract");
  await fs.promises.mkdir(tempExtractPath, { recursive: true });

  await tar.x({
    file: archivePath,
    cwd: tempExtractPath,
    strip: 1, // Strip the top-level directory created by GitHub
  });

  // Move all contents from temp to destination
  const contents = await fs.promises.readdir(tempExtractPath);
  for (const item of contents) {
    const sourcePath = path.join(tempExtractPath, item);
    const destPath = path.join(destinationPath, item);
    await fs.promises.rename(sourcePath, destPath);
  }

  // Clean up temp directory
  await fs.promises.rm(tempExtractPath, { recursive: true, force: true });
}

/**
 * Helper function to download a repository with GitHub App authentication
 */
export async function downloadRepositoryWithApp(
  owner: string,
  repo: string,
  destinationPath: string,
  options?: {
    branch?: string;
    ref?: string;
    format?: "zip" | "tar";
    installationId?: string;
    appId?: string;
    privateKey?: string;
  }
): Promise<DownloadResult> {
  // Get credentials from environment if not provided
  const installationId =
    options?.installationId || process.env.GITHUB_APP_INSTALLATION_ID;
  const appId = options?.appId || process.env.GITHUB_APP_ID;
  const privateKey = options?.privateKey || process.env.GITHUB_PRIVATE_KEY;

  if (!installationId || !appId || !privateKey) {
    return {
      success: false,
      path: destinationPath,
      message:
        "Missing GitHub App credentials. Set GITHUB_APP_ID, GITHUB_PRIVATE_KEY, and GITHUB_APP_INSTALLATION_ID environment variables.",
    };
  }

  // Get installation token
  const { getInstallationTokenString } = await import("./auth");
  const token = await getInstallationTokenString(
    installationId,
    appId,
    privateKey
  );

  // Download repository
  return downloadRepository({
    owner,
    repo,
    token,
    destinationPath,
    branch: options?.branch,
    ref: options?.ref,
    format: options?.format,
  });
}
