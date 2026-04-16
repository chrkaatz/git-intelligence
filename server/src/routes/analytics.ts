import { Router, Request, Response } from 'express';
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
  getRiskAnalytics,
  getCrossRepoRiskAnalytics,
  getTechnicalDebtIndicators,
  getCrossRepoTechnicalDebtIndicators,
  getReadinessDiagnostics,
  getCrossRepoReadinessDiagnostics,
} from '../git/index.js';
import {
  getRepository,
  getCachedTechnicalDebtIndicators,
  getOllamaSettings,
  getCachedAIInsights,
  setCachedAIInsights,
} from '../db.js';
import { jobQueue } from '../queue/jobQueue.js';
import { generateInsights } from '../services/aiAnalysis.js';

const router = Router();
const DEFAULT_EVOLUTION_WINDOW_MONTHS = 12;

// Helper function to resolve repository ID to path
async function resolveRepositoryPath(repoId: string): Promise<string> {
  const repository = await getRepository(repoId);
  if (!repository) {
    throw new Error('Repository not found');
  }
  return repository.path;
}

function parseSinceMonths(
  value: unknown,
  defaultValue: number = DEFAULT_EVOLUTION_WINDOW_MONTHS
): number {
  if (typeof value !== 'string' || value.trim() === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return defaultValue;
  }

  return Math.floor(parsed);
}

// Basic statistics
router.get('/stats', async (req: Request, res: Response) => {
  const { repoId, refresh } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    const repoPath = await resolveRepositoryPath(repoId);
    const useCache = refresh !== 'true';
    const stats = await getStats(repoPath, useCache);
    res.json(stats);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Repository not found') {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.status(500).json({ error: 'Failed to analyze project' });
  }
});

// Developer analytics
router.get('/developer-analytics', async (req: Request, res: Response) => {
  const { repoId, refresh, ai } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    const repoPath = await resolveRepositoryPath(repoId);
    const useCache = refresh !== 'true';
    const includeAIInsights = ai === 'true' ? true : undefined;
    const analytics = await getDeveloperAnalytics(repoPath, useCache, includeAIInsights);
    res.json(analytics);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Repository not found') {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.status(500).json({ error: 'Failed to get developer analytics' });
  }
});

router.get('/cross-repo-developer-analytics', async (req: Request, res: Response) => {
  const { projectId, refresh, ai } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
    const useCache = refresh !== 'true';
    const includeAIInsights = ai === 'true' ? true : undefined;
    const analytics = await getCrossRepoDeveloperAnalytics(projectId, useCache, includeAIInsights);
    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get cross-repo developer analytics' });
  }
});

// Codebase health
router.get('/codebase-health', async (req: Request, res: Response) => {
  const { repoId, refresh, ai } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    const repoPath = await resolveRepositoryPath(repoId);
    const useCache = refresh !== 'true';
    const includeAIInsights = ai === 'true' ? true : undefined;
    const health = await getCodebaseHealth(repoPath, useCache, includeAIInsights);
    res.json(health);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Repository not found') {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.status(500).json({ error: 'Failed to get codebase health metrics' });
  }
});

router.get('/cross-repo-codebase-health', async (req: Request, res: Response) => {
  const { projectId, refresh } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
    const useCache = refresh !== 'true';
    const health = await getCrossRepoCodebaseHealth(projectId, useCache);
    res.json(health);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get cross-repo codebase health metrics' });
  }
});

// Repository evolution
router.get('/repository-evolution', async (req: Request, res: Response) => {
  const { repoId, refresh, ai, sinceMonths } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    const repoPath = await resolveRepositoryPath(repoId);
    const useCache = refresh !== 'true';
    const includeAIInsights = ai === 'true' ? true : undefined;
    const evolution = await getRepositoryEvolution(
      repoPath,
      useCache,
      includeAIInsights,
      parseSinceMonths(sinceMonths)
    );
    res.json(evolution);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Repository not found') {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.status(500).json({ error: 'Failed to get repository evolution metrics' });
  }
});

router.get('/cross-repo-repository-evolution', async (req: Request, res: Response) => {
  const { projectId, refresh, sinceMonths } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
    const useCache = refresh !== 'true';
    const evolution = await getCrossRepoRepositoryEvolution(
      projectId,
      useCache,
      parseSinceMonths(sinceMonths)
    );
    res.json(evolution);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get cross-repo repository evolution metrics' });
  }
});

// Bus factor and ownership
router.get('/bus-factor-and-ownership', async (req: Request, res: Response) => {
  const { repoId, refresh, ai } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    const repoPath = await resolveRepositoryPath(repoId);
    const useCache = refresh !== 'true';
    const includeAIInsights = ai === 'true' ? true : undefined;
    const analytics = await getBusFactorAndOwnership(repoPath, useCache, includeAIInsights);
    res.json(analytics);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Repository not found') {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.status(500).json({ error: 'Failed to get bus factor and ownership metrics' });
  }
});

router.get('/cross-repo-bus-factor-and-ownership', async (req: Request, res: Response) => {
  const { projectId, refresh } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
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

// Social network analysis
router.get('/social-network-analysis', async (req: Request, res: Response) => {
  const { repoId, refresh, ai } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    const repoPath = await resolveRepositoryPath(repoId);
    const useCache = refresh !== 'true';
    const includeAIInsights = ai === 'true' ? true : undefined;
    const analysis = await getSocialNetworkAnalysis(repoPath, useCache, includeAIInsights);
    res.json(analysis);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Repository not found') {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.status(500).json({ error: 'Failed to get social network analysis' });
  }
});

router.get('/cross-repo-social-network-analysis', async (req: Request, res: Response) => {
  const { projectId, refresh } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
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

// Risk analytics
router.get('/risk-analytics', async (req: Request, res: Response) => {
  const { repoId, refresh, ai } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    const repoPath = await resolveRepositoryPath(repoId);
    const useCache = refresh !== 'true';
    const includeAIInsights = ai === 'true' ? true : undefined;
    const analytics = await getRiskAnalytics(repoPath, useCache, includeAIInsights);
    res.json(analytics);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Repository not found') {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.status(500).json({ error: 'Failed to get risk analytics' });
  }
});

router.get('/cross-repo-risk-analytics', async (req: Request, res: Response) => {
  const { projectId, refresh } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
    const useCache = refresh !== 'true';
    const analytics = await getCrossRepoRiskAnalytics(projectId, useCache);
    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get cross-repo risk analytics' });
  }
});

// Technical debt indicators - queue-based with progress
router.get('/technical-debt-indicators', async (req: Request, res: Response) => {
  const { repoId, refresh, jobId, ai } = req.query;

  // If jobId is provided, return job status
  if (jobId && typeof jobId === 'string') {
    const job = jobQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.json(job);
  }

  // Otherwise, create a new job
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }

  try {
    const repoPath = await resolveRepositoryPath(repoId);
    const useCache = refresh !== 'true';
    const includeAIInsights = ai === 'true' ? true : undefined;

    // Check cache first if not refreshing
    if (useCache) {
      const cached = await getCachedTechnicalDebtIndicators(repoPath); // Uses default 30-day TTL as fallback
      if (cached) {
        // If AI insights are requested, check cache first, then generate if needed
        if (includeAIInsights) {
          try {
            const ollamaSettings = await getOllamaSettings();
            if (ollamaSettings.enabled) {
              // Check for cached AI insights first
              const cachedInsights = await getCachedAIInsights(
                repoPath,
                'technical-debt-indicators'
              );
              if (cachedInsights) {
                return res.json({ ...cached, aiInsights: cachedInsights });
              }
              // Generate new insights if not cached
              const insights = await generateInsights(
                'technical-debt-indicators',
                cached,
                ollamaSettings
              );
              // Cache the insights
              await setCachedAIInsights(repoPath, 'technical-debt-indicators', insights);
              return res.json({ ...cached, aiInsights: insights });
            }
          } catch (error) {
            // Log error but don't fail the entire request if AI insights fail
            console.warn('Failed to generate AI insights for technical debt indicators:', error);
          }
        }
        return res.json(cached);
      }
    }

    // Create job and return job ID
    const jobId = jobQueue.createJob('technical-debt-indicators');
    console.log(`[Technical Debt] Starting analysis for ${repoPath} (jobId: ${jobId})`);

    // Start the analysis in the background (queue will handle concurrency)
    (async () => {
      // Wait for job to be ready (queue will start it when capacity is available)
      const waitForJob = () => {
        return new Promise<void>((resolve) => {
          const checkJob = () => {
            const job = jobQueue.getJob(jobId);
            if (job && job.status === 'running') {
              console.log(`[Technical Debt] Job ${jobId} is now running`);
              resolve();
            } else {
              setTimeout(checkJob, 100);
            }
          };
          checkJob();
        });
      };

      await waitForJob();

      try {
        const indicators = await getTechnicalDebtIndicators(
          repoPath,
          useCache,
          (progress, step) => {
            jobQueue.updateProgress(jobId, progress, step);
          },
          includeAIInsights
        );
        console.log(`[Technical Debt] Analysis completed for ${repoPath} (jobId: ${jobId})`);
        jobQueue.completeJob(jobId, indicators);
        jobQueue.jobFinished(); // Process next job in queue
      } catch (error: any) {
        console.error(`[Technical Debt] Analysis failed for ${repoPath} (jobId: ${jobId}):`, error);
        jobQueue.failJob(jobId, error.message || 'Analysis failed');
        jobQueue.jobFinished(); // Process next job in queue
      }
    })();

    res.json({ jobId, status: 'pending' });
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Repository not found') {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.status(500).json({ error: 'Failed to start technical debt analysis' });
  }
});

router.get('/cross-repo-technical-debt-indicators', async (req: Request, res: Response) => {
  const { projectId, refresh } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
    const useCache = refresh !== 'true';
    const indicators = await getCrossRepoTechnicalDebtIndicators(projectId, useCache);
    res.json(indicators);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get cross-repo technical debt indicators' });
  }
});

router.get('/readiness-diagnostics', async (req: Request, res: Response) => {
  const { repoId, refresh, ai } = req.query;
  if (!repoId || typeof repoId !== 'string') {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  try {
    const repoPath = await resolveRepositoryPath(repoId);
    const useCache = refresh !== 'true';
    const includeAIInsights = ai === 'true' ? true : undefined;
    const diagnostics = await getReadinessDiagnostics(repoPath, useCache, includeAIInsights);
    res.json(diagnostics);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Repository not found') {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.status(500).json({ error: 'Failed to get readiness diagnostics' });
  }
});

router.get('/cross-repo-readiness-diagnostics', async (req: Request, res: Response) => {
  const { projectId, refresh, ai } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  try {
    const useCache = refresh !== 'true';
    const includeAIInsights = ai === 'true' ? true : undefined;
    const diagnostics = await getCrossRepoReadinessDiagnostics(
      projectId,
      useCache,
      includeAIInsights
    );
    res.json(diagnostics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get cross-repo readiness diagnostics' });
  }
});

export default router;
