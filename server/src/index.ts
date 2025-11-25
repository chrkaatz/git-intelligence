import express from 'express';
import cors from 'cors';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';
import {
  getStats,
  getDeveloperAnalytics,
  getCrossRepoDeveloperAnalytics,
  getCodebaseHealth,
  getCrossRepoCodebaseHealth,
  getRepositoryEvolution,
  getCrossRepoRepositoryEvolution,
  getBusFactorAndOwnership,
  getCrossRepoBusFactorAndOwnership,
  getSocialNetworkAnalysis,
  getCrossRepoSocialNetworkAnalysis,
} from './git';
import {
  getProjects,
  getProject,
  addProject as addProjectToDb,
  updateProject,
  removeProject as removeProjectFromDb,
  getRepositories,
  getRepository,
  addRepository,
  removeRepository,
  clearCache,
} from './db';

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

// Projects endpoints
app.get('/projects', async (req, res) => {
  try {
    const projects = await getProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/projects/:id', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

app.post('/projects', async (req, res) => {
  const { name, description } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const project = await addProjectToDb(name, description);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add project' });
  }
});

app.put('/projects/:id', async (req, res) => {
  const { name, description } = req.body;
  try {
    const project = await updateProject(req.params.id, { name, description });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/projects/:id', async (req, res) => {
  try {
    await removeProjectFromDb(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove project' });
  }
});

// Repositories endpoints
app.get('/repositories', async (req, res) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const repositories = await getRepositories(projectId);
    res.json(repositories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

app.get('/repositories/:id', async (req, res) => {
  try {
    const repository = await getRepository(req.params.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.json(repository);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repository' });
  }
});

app.post('/repositories', async (req, res) => {
  const { projectId, path, name, replace } = req.body;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Path is required' });
  }
  try {
    const repository = await addRepository(projectId, path, name, replace);
    res.json(repository);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add repository' });
  }
});

app.delete('/repositories/:id', async (req, res) => {
  try {
    await removeRepository(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove repository' });
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

app.post('/cache/clear', async (req, res) => {
  const { repoId } = req.body;
  try {
    let path: string | undefined;
    if (repoId) {
      const repository = await getRepository(repoId);
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      path = repository.path;
    }
    await clearCache(path);
    res.json({
      message: path ? 'Cache cleared for repository' : 'All cache cleared',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

app.get('/stats', async (req, res) => {
  const { repoId, refresh } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    // Resolve repoId to path
    const repository = await getRepository(repoId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const stats = await getStats(repository.path, useCache);
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyze project' });
  }
});

app.get('/developer-analytics', async (req, res) => {
  const { repoId, refresh } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    // Resolve repoId to path
    const repository = await getRepository(repoId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const analytics = await getDeveloperAnalytics(repository.path, useCache);
    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get developer analytics' });
  }
});

app.get('/cross-repo-developer-analytics', async (req, res) => {
  const { projectId, refresh } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const analytics = await getCrossRepoDeveloperAnalytics(projectId, useCache);
    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get cross-repo developer analytics' });
  }
});

app.get('/codebase-health', async (req, res) => {
  const { repoId, refresh } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    // Resolve repoId to path
    const repository = await getRepository(repoId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const health = await getCodebaseHealth(repository.path, useCache);
    res.json(health);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get codebase health metrics' });
  }
});

app.get('/cross-repo-codebase-health', async (req, res) => {
  const { projectId, refresh } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const health = await getCrossRepoCodebaseHealth(projectId, useCache);
    res.json(health);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get cross-repo codebase health metrics' });
  }
});

app.get('/repository-evolution', async (req, res) => {
  const { repoId, refresh } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    // Resolve repoId to path
    const repository = await getRepository(repoId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const evolution = await getRepositoryEvolution(repository.path, useCache);
    res.json(evolution);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get repository evolution metrics' });
  }
});

app.get('/cross-repo-repository-evolution', async (req, res) => {
  const { projectId, refresh } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const evolution = await getCrossRepoRepositoryEvolution(projectId, useCache);
    res.json(evolution);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get cross-repo repository evolution metrics' });
  }
});

app.get('/bus-factor-and-ownership', async (req, res) => {
  const { repoId, refresh } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    // Resolve repoId to path
    const repository = await getRepository(repoId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const analytics = await getBusFactorAndOwnership(repository.path, useCache);
    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get bus factor and ownership metrics' });
  }
});

app.get('/cross-repo-bus-factor-and-ownership', async (req, res) => {
  const { projectId, refresh } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const analytics = await getCrossRepoBusFactorAndOwnership(projectId, useCache);
    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Failed to get cross-repo bus factor and ownership metrics',
    });
  }
});

app.get('/social-network-analysis', async (req, res) => {
  const { repoId, refresh } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    // Resolve repoId to path
    const repository = await getRepository(repoId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const analysis = await getSocialNetworkAnalysis(repository.path, useCache);
    res.json(analysis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get social network analysis' });
  }
});

app.get('/cross-repo-social-network-analysis', async (req, res) => {
  const { projectId, refresh } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
    // Use cache by default, unless refresh=true
    const useCache = refresh !== 'true';
    const analysis = await getCrossRepoSocialNetworkAnalysis(projectId, useCache);
    res.json(analysis);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Failed to get cross-repo social network analysis',
    });
  }
});

// Error handling middleware for multer errors
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    return res.status(400).json({ error: `File upload error: ${error.message}` });
  }
  if (error) {
    console.error('Unhandled error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  next();
});

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
