import { Router, Request, Response } from 'express';
import {
  getRepositories,
  getRepository,
  addRepository,
  removeRepository,
  reorderRepositories,
} from '../db.js';
import simpleGit from 'simple-git';
import { clearCache } from '../db/cache.js';
import fs from 'fs';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const repositories = await getRepositories(projectId);
    res.json(repositories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
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

router.post('/', async (req: Request, res: Response) => {
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

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await removeRepository(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove repository' });
  }
});

router.post('/reorder', async (req: Request, res: Response) => {
  const { projectId, repositoryIds } = req.body;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'projectId is required' });
  }
  if (!Array.isArray(repositoryIds) || repositoryIds.length === 0) {
    return res.status(400).json({ error: 'repositoryIds array is required' });
  }
  try {
    await reorderRepositories(projectId, repositoryIds);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder repositories' });
  }
});

router.post('/:id/fetch', async (req: Request, res: Response) => {
  try {
    const repository = await getRepository(req.params.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Check if path exists and is a directory
    if (!fs.existsSync(repository.path)) {
      return res.status(400).json({
        error: 'Repository path does not exist',
        path: repository.path,
      });
    }

    const stats = fs.statSync(repository.path);
    if (!stats.isDirectory()) {
      return res.status(400).json({
        error: 'Repository path is not a directory',
        path: repository.path,
      });
    }

    // Initialize git for this repository
    const git = simpleGit(repository.path);

    // Check if it's a valid git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return res.status(400).json({
        error: 'Path is not a valid Git repository',
        path: repository.path,
      });
    }

    // Get current commit hash before fetch
    const beforeHash = await git.revparse(['HEAD']);

    // Fetch from all remotes
    await git.fetch(['--all', '--prune']);

    // Get current branch
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);

    // Try to pull changes for current branch (if it has an upstream)
    let pulled = false;
    let pullError: string | null = null;
    try {
      const pullResult = await git.pull();
      pulled =
        pullResult.summary.changes > 0 ||
        pullResult.summary.insertions > 0 ||
        pullResult.summary.deletions > 0;
    } catch (error: any) {
      // Pull might fail if there's no upstream or local changes
      pullError = error.message || 'Pull failed';
    }

    // Get commit hash after fetch/pull
    const afterHash = await git.revparse(['HEAD']);

    // Check if there were any changes
    const hasChanges = beforeHash !== afterHash;

    // Clear cache for this repository to ensure fresh analytics
    if (hasChanges) {
      await clearCache(repository.path);
    }

    res.json({
      success: true,
      repository: {
        id: repository.id,
        name: repository.name,
        path: repository.path,
      },
      changes: {
        fetched: true,
        pulled,
        hasChanges,
        branch: branch.trim(),
        beforeHash: beforeHash.trim(),
        afterHash: afterHash.trim(),
      },
      pullError,
      message: hasChanges
        ? `Successfully fetched and updated ${repository.name}`
        : `Repository ${repository.name} is already up to date`,
    });
  } catch (error: any) {
    console.error('Error fetching repository:', error);
    res.status(500).json({
      error: 'Failed to fetch repository changes',
      details: error.message,
    });
  }
});

export default router;
