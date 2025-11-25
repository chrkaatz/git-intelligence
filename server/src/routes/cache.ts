import { Router, Request, Response } from 'express';
import { getRepository, clearCache } from '../db';

const router = Router();

router.post('/clear', async (req: Request, res: Response) => {
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

export default router;
