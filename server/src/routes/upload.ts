import { Router, Request, Response } from 'express';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';
import { upload } from '../config/multer';
import { addRepository } from '../db';

const router = Router();

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  console.log('Upload request received');

  if (!req.file) {
    console.error('No file in upload request');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log('File received:', req.file.originalname, req.file.size, 'bytes');

  // Parse form fields from multipart/form-data
  const projectId = req.body?.projectId?.trim();
  const repoName = req.body?.name?.trim() || undefined;
  const replace = req.body?.replace === 'true' || req.body?.replace === true;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  console.log('Project ID:', projectId, 'Repository name:', repoName, 'Replace:', replace);

  let extractPath: string | null = null;

  try {
    const zip = new AdmZip(req.file.path);
    extractPath = path.join(process.cwd(), 'uploads', req.file.filename + '_extracted');

    // Create directory if it doesn't exist
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    zip.extractAllTo(extractPath, true);

    // Clean up zip file
    fs.unlinkSync(req.file.path);

    // Find the actual git repo root (in case it's nested)
    let repoPath = extractPath;
    const items = fs.readdirSync(extractPath).filter((item) => item !== '__MACOSX');

    // If there's only one directory and it's not .git, assume it's a wrapper folder
    if (
      items.length === 1 &&
      fs.statSync(path.join(extractPath, items[0])).isDirectory() &&
      items[0] !== '.git'
    ) {
      repoPath = path.join(extractPath, items[0]);
    }

    // Validate that this is actually a git repository
    const git = simpleGit(repoPath);
    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      // Clean up extracted files
      if (extractPath && fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
      }
      return res.status(400).json({
        error:
          'The uploaded archive does not contain a valid Git repository. Please ensure the ZIP file contains a repository with a .git directory.',
      });
    }

    console.log('Adding repository to database...');
    const repository = await addRepository(projectId, repoPath, repoName, replace);
    console.log('Repository added successfully:', repository.id);

    res.json(repository);
  } catch (error: any) {
    console.error('Upload error:', error);
    console.error('Error stack:', error?.stack);

    // Clean up extracted files on error
    if (extractPath && fs.existsSync(extractPath)) {
      try {
        fs.rmSync(extractPath, { recursive: true, force: true });
        console.log('Cleaned up extracted files');
      } catch (cleanupError) {
        console.error('Failed to clean up extracted files:', cleanupError);
      }
    }

    // Provide more specific error messages
    const errorMessage = error?.message || 'Failed to process upload';
    const statusCode = error?.statusCode || 500;

    res.status(statusCode).json({
      error: errorMessage.includes('Not a git repository')
        ? 'The uploaded archive does not contain a valid Git repository.'
        : errorMessage,
    });
  }
});

export default router;
