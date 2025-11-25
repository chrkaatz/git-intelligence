import express from 'express';
import cors from 'cors';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';
import { getStats, getDeveloperAnalytics } from './git';
import { getProjects, addProject, removeProject, clearCache } from './db';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

app.get('/projects', async (req, res) => {
  try {
    const projects = await getProjects();
    // If no projects, add current working directory as default
    if (projects.length === 0) {
      await addProject(process.cwd());
      return res.json(await getProjects());
    }
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  console.log('Upload request received');

  if (!req.file) {
    console.error('No file in upload request');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log('File received:', req.file.originalname, req.file.size, 'bytes');

  // Parse form fields from multipart/form-data
  // Note: req.body fields are available when using multer
  const projectName = req.body?.name?.trim() || undefined;
  const replace = req.body?.replace === 'true' || req.body?.replace === true;

  console.log('Project name:', projectName, 'Replace:', replace);

  let extractPath: string | null = null;

  try {
    const zip = new AdmZip(req.file.path);
    extractPath = path.join(
      process.cwd(),
      'uploads',
      req.file.filename + '_extracted'
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    zip.extractAllTo(extractPath, true);

    // Clean up zip file
    fs.unlinkSync(req.file.path);

    // Find the actual git repo root (in case it's nested)
    let repoPath = extractPath;
    const items = fs
      .readdirSync(extractPath)
      .filter((item) => item !== '__MACOSX');

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

    console.log('Adding project to database...');
    const project = await addProject(repoPath, projectName, replace);
    console.log('Project added successfully:', project.id);

    res.json(project);
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

    // Ensure we always send a response
    try {
      // Provide more specific error messages
      const errorMessage = error?.message || 'Failed to process upload';
      const statusCode = error?.statusCode || 500;

      res.status(statusCode).json({
        error: errorMessage.includes('Not a git repository')
          ? 'The uploaded archive does not contain a valid Git repository.'
          : errorMessage,
      });
    } catch (responseError) {
      console.error('Failed to send error response:', responseError);
      // If we can't send JSON, try to send a plain text response
      if (!res.headersSent) {
        res.status(500).send('Internal server error');
      }
    }
  }
});

app.post('/projects', async (req, res) => {
  const { path } = req.body;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Path is required' });
  }
  try {
    const project = await addProject(path);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add project' });
  }
});

app.delete('/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await removeProject(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove project' });
  }
});

app.post('/cache/clear', async (req, res) => {
  const { path } = req.body;
  try {
    await clearCache(path);
    res.json({
      message: path ? 'Cache cleared for project' : 'All cache cleared',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

app.get('/stats', async (req, res) => {
  const { path, refresh } = req.query;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Path is required' });
  }
  try {
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const stats = await getStats(path, useCache);
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyze project' });
  }
});

app.get('/developer-analytics', async (req, res) => {
  const { path, refresh } = req.query;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Path is required' });
  }
  try {
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const analytics = await getDeveloperAnalytics(path, useCache);
    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get developer analytics' });
  }
});

// Error handling middleware for multer errors
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (error instanceof multer.MulterError) {
      console.error('Multer error:', error);
      return res
        .status(400)
        .json({ error: `File upload error: ${error.message}` });
    }
    if (error) {
      console.error('Unhandled error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
    next();
  }
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
