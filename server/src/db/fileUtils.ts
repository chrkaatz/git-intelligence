import path from 'path';
import fs from 'fs';

/**
 * Checks if a repository path is within the uploads directory
 * and deletes the folder if it exists.
 * Only deletes folders that are in the uploads directory to avoid
 * accidentally deleting local repositories.
 */
export function deleteUploadedFolder(repoPath: string): void {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const normalizedRepoPath = path.resolve(repoPath);
    const normalizedUploadsDir = path.resolve(uploadsDir);

    // Check if the repository path is within the uploads directory
    if (
      normalizedRepoPath.startsWith(normalizedUploadsDir + path.sep) ||
      normalizedRepoPath === normalizedUploadsDir
    ) {
      // This is an uploaded repository, delete the folder
      if (fs.existsSync(repoPath)) {
        fs.rmSync(repoPath, { recursive: true, force: true });
        console.log(`Deleted uploaded folder: ${repoPath}`);
      }
    }
    // If it's not in uploads, it's a local repository - don't delete it
  } catch (error) {
    // Log error but don't throw - we don't want to fail repository/project deletion if folder deletion fails
    console.error(`Failed to delete uploaded folder ${repoPath}:`, error);
  }
}
