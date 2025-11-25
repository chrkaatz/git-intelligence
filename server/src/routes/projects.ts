import { Router, Request, Response } from 'express';
import { getProjects, getProject, addProject, updateProject, removeProject } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const projects = await getProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
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

router.post('/', async (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const project = await addProject(name, description);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add project' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
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

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await removeProject(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove project' });
  }
});

export default router;
