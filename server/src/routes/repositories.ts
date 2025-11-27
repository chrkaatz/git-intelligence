import { Router, Request, Response } from 'express';
import {
  getRepositories,
  getRepository,
  addRepository,
  removeRepository,
  reorderRepositories,
} from '../db.js';

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

export default router;
