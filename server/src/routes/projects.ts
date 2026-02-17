import { Router, Request, Response } from 'express';
import {
  getProjects,
  getProject,
  addProject,
  updateProject,
  removeProject,
  reorderProjects,
} from '../db.js';

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

router.post('/reorder', async (req: Request, res: Response) => {
  const { projectIds } = req.body;
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return res.status(400).json({ error: 'projectIds array is required' });
  }
  try {
    await reorderProjects(projectIds);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder projects' });
  }
});

// Run all analyses for a project (batch for all repositories)
router.post('/:id/analyze-all', async (req: Request, res: Response) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { getRepositories } = await import('../db/repositories.js');
    const repositories = await getRepositories(project.id);

    if (repositories.length === 0) {
      return res.status(400).json({ error: 'Project has no repositories' });
    }

    const { jobQueue } = await import('../queue/jobQueue.js');
    const {
      getStats,
      getDeveloperAnalytics,
      getCodebaseHealth,
      getRepositoryEvolution,
      getBusFactorAndOwnership,
      getSocialNetworkAnalysis,
      getRiskAnalytics,
      getCrossRepoDeveloperAnalytics,
      getCrossRepoCodebaseHealth,
      getCrossRepoRepositoryEvolution,
      getCrossRepoBusFactorAndOwnership,
      getCrossRepoSocialNetworkAnalysis,
      getCrossRepoRiskAnalytics,
      getCrossRepoTechnicalDebtIndicators,
    } = await import('../git/index.js');

    // Create a job with project data
    const jobId = jobQueue.createJob('analyze-all', { projectId: project.id });

    console.log(
      `[Analyze All Project] Starting all analyses for project ${project.name} (${repositories.length} repos) (jobId: ${jobId})`
    );

    // Run analyses in the background
    (async () => {
      // Wait for job to be ready
      const waitForJob = () => {
        return new Promise<void>((resolve) => {
          const checkJob = () => {
            const job = jobQueue.getJob(jobId);
            if (job && job.status === 'running') {
              resolve();
            } else {
              setTimeout(checkJob, 100);
            }
          };
          checkJob();
        });
      };

      await waitForJob();

      const repoSteps = [
        { name: 'Statistics', fn: getStats },
        { name: 'Developer Analytics', fn: getDeveloperAnalytics },
        { name: 'Codebase Health', fn: getCodebaseHealth },
        { name: 'Repository Evolution', fn: getRepositoryEvolution },
        { name: 'Bus Factor & Ownership', fn: getBusFactorAndOwnership },
        { name: 'Social Network Analysis', fn: getSocialNetworkAnalysis },
        { name: 'Risk Analytics', fn: getRiskAnalytics },
      ];

      const crossRepoSteps = [
        { name: 'Cross-Repo Developer Analytics', fn: getCrossRepoDeveloperAnalytics },
        { name: 'Cross-Repo Codebase Health', fn: getCrossRepoCodebaseHealth },
        { name: 'Cross-Repo Repository Evolution', fn: getCrossRepoRepositoryEvolution },
        { name: 'Cross-Repo Bus Factor & Ownership', fn: getCrossRepoBusFactorAndOwnership },
        { name: 'Cross-Repo Social Network Analysis', fn: getCrossRepoSocialNetworkAnalysis },
        { name: 'Cross-Repo Risk Analytics', fn: getCrossRepoRiskAnalytics },
        { name: 'Cross-Repo Technical Debt', fn: getCrossRepoTechnicalDebtIndicators },
      ];

      const totalSteps = repositories.length * repoSteps.length + crossRepoSteps.length;
      let completedSteps = 0;

      // 1. Analyze each repository
      for (let r = 0; r < repositories.length; r++) {
        const repo = repositories[r];
        for (let s = 0; s < repoSteps.length; s++) {
          const step = repoSteps[s];
          const progress = Math.round((completedSteps / totalSteps) * 100);
          jobQueue.updateProgress(
            jobId,
            progress,
            `Analyzing ${repo.name} (${r + 1}/${repositories.length}): ${step.name}...`
          );

          try {
            await step.fn(repo.path, true); // Use refresh: true
          } catch (error: any) {
            console.error(
              `[Analyze All Project] ${step.name} failed for ${repo.name}:`,
              error.message
            );
          }
          completedSteps++;
        }
      }

      // 2. Run cross-repo analyses
      for (let s = 0; s < crossRepoSteps.length; s++) {
        const step = crossRepoSteps[s];
        const progress = Math.round((completedSteps / totalSteps) * 100);
        jobQueue.updateProgress(jobId, progress, `Running ${step.name}...`);

        try {
          await step.fn(project.id, true); // Use refresh: true
        } catch (error: any) {
          console.error(
            `[Analyze All Project] ${step.name} failed for ${project.name}:`,
            error.message
          );
        }
        completedSteps++;
      }

      jobQueue.completeJob(jobId, {
        project: { id: project.id, name: project.name },
        repoCount: repositories.length,
        completedSteps,
        totalSteps,
      });
      jobQueue.jobFinished();
    })();

    res.json({ jobId, status: 'pending', projectName: project.name });
  } catch (error: any) {
    console.error('Error starting project analyze-all:', error);
    res.status(500).json({
      error: 'Failed to start project analysis',
      details: error.message,
    });
  }
});

export default router;
