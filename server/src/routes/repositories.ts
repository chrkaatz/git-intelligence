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
import { classifyAnalysisStepError } from './analysisErrors.js';

const router = Router();
const ANALYZE_STEP_TIMEOUT_MS = 180000; // 3 minutes per step

const runWithTimeout = async <T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  stepName: string
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${stepName} timed out after ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const repositories = await getRepositories(projectId);
    res.json(repositories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Get analyze-all job status (must be before /:id to avoid wildcard match)
router.get('/analyze-all/status', async (req: Request, res: Response) => {
  const { jobId } = req.query;
  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  const { jobQueue } = await import('../queue/jobQueue.js');
  const job = jobQueue.getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

// Get all active analyze-all jobs (must be before /:id)
router.get('/analyze-all/active', async (req: Request, res: Response) => {
  const { jobQueue } = await import('../queue/jobQueue.js');
  const activeJobs = jobQueue.getActiveJobs('analyze-all');
  res.json(activeJobs);
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

    // Check if there were any changes (trim hashes to handle trailing newlines from simple-git)
    const hasChanges = beforeHash.trim() !== afterHash.trim();

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

// Run all analyses for a repository
router.post('/:id/analyze-all', async (req: Request, res: Response) => {
  try {
    const repository = await getRepository(req.params.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
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
      getReadinessDiagnostics,
      getCrossRepoReadinessDiagnostics,
    } = await import('../git/index.js');

    const repoPath = repository.path;
    // Pass repoId in data so we can rebuild UI state on refresh
    const jobId = jobQueue.createJob('analyze-all', { repoId: repository.id });

    console.log(
      `[Analyze All] Starting all analyses for ${repository.name} (${repoPath}) (jobId: ${jobId})`
    );

    // Run analyses in the background
    (async () => {
      try {
        // Wait for job to be ready (queue will start it when capacity is available)
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

        const analysisSteps = [
          { name: 'Statistics', fn: () => getStats(repoPath, true) },
          { name: 'Developer Analytics', fn: () => getDeveloperAnalytics(repoPath, true) },
          { name: 'Codebase Health', fn: () => getCodebaseHealth(repoPath, true) },
          { name: 'Repository Evolution', fn: () => getRepositoryEvolution(repoPath, true) },
          { name: 'Bus Factor & Ownership', fn: () => getBusFactorAndOwnership(repoPath, true) },
          { name: 'Social Network Analysis', fn: () => getSocialNetworkAnalysis(repoPath, true) },
          { name: 'Risk Analytics', fn: () => getRiskAnalytics(repoPath, true) },
          { name: 'Readiness diagnostics', fn: () => getReadinessDiagnostics(repoPath, true) },
        ];

        // If this repo is part of a project, also add cross-repo steps
        if (repository.projectId) {
          const projectId = repository.projectId;
          analysisSteps.push(
            {
              name: 'Cross-Repo Developer Analytics',
              fn: () => getCrossRepoDeveloperAnalytics(projectId, true),
            },
            {
              name: 'Cross-Repo Codebase Health',
              fn: () => getCrossRepoCodebaseHealth(projectId, true),
            },
            {
              name: 'Cross-Repo Repository Evolution',
              fn: () => getCrossRepoRepositoryEvolution(projectId, true),
            },
            {
              name: 'Cross-Repo Bus Factor & Ownership',
              fn: () => getCrossRepoBusFactorAndOwnership(projectId, true),
            },
            {
              name: 'Cross-Repo Social Network Analysis',
              fn: () => getCrossRepoSocialNetworkAnalysis(projectId, true),
            },
            {
              name: 'Cross-Repo Risk Analytics',
              fn: () => getCrossRepoRiskAnalytics(projectId, true),
            },
            {
              name: 'Cross-Repo Technical Debt',
              fn: () => getCrossRepoTechnicalDebtIndicators(projectId, true),
            },
            {
              name: 'Cross-Repo Readiness diagnostics',
              fn: () => getCrossRepoReadinessDiagnostics(projectId, true),
            }
          );
        }

        const results: Record<string, any> = {};
        const errors: Record<string, string> = {};
        let completedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < analysisSteps.length; i++) {
          const step = analysisSteps[i];
          const progress = Math.round((i / analysisSteps.length) * 100);
          jobQueue.updateProgress(jobId, progress, `Running ${step.name}...`);

          try {
            results[step.name] = await runWithTimeout(
              () => step.fn(),
              ANALYZE_STEP_TIMEOUT_MS,
              `${step.name} (${repository.name})`
            );
            completedCount++;
          } catch (error: any) {
            const classifiedError = classifyAnalysisStepError(error);
            console.error(
              `[Analyze All] ${step.name} failed for ${repository.name}:`,
              classifiedError
            );
            errors[step.name] = classifiedError;
            failedCount++;
          }
        }

        const summary = {
          repository: { id: repository.id, name: repository.name, path: repoPath },
          completedCount,
          failedCount,
          totalCount: analysisSteps.length,
          completed: Object.keys(results),
          failed: errors,
        };

        jobQueue.completeJob(jobId, summary);
      } catch (error: any) {
        console.error(`[Analyze All] Job ${jobId} failed for ${repository.name}:`, error.message);
        jobQueue.failJob(jobId, error.message || 'Analyze all repository job failed');
      } finally {
        jobQueue.jobFinished(); // Process next job in queue
      }
    })();

    res.json({ jobId, status: 'pending', repoName: repository.name });
  } catch (error: any) {
    console.error('Error starting analyze-all:', error);
    res.status(500).json({
      error: 'Failed to start analysis',
      details: error.message,
    });
  }
});

export default router;
