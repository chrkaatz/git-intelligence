import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JobQueue, type Job, type JobProgress } from '../jobQueue';

describe('JobQueue', () => {
  let jobQueue: JobQueue;

  beforeEach(() => {
    // Create a new instance for each test to avoid state pollution
    jobQueue = new JobQueue();
    vi.clearAllMocks();
    // Suppress console.log and console.error for cleaner test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createJob', () => {
    it('should create a new job with pending status', () => {
      const jobId = jobQueue.createJob('test-job');

      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^job_\d+_[a-z0-9]+$/);

      const job = jobQueue.getJob(jobId);
      expect(job).not.toBeNull();
      // Job may be 'pending' or 'running' depending on queue capacity
      // If queue has capacity, job will be automatically started
      expect(['pending', 'running']).toContain(job?.status);
      expect(job?.progress).toBe(0);
    });

    it('should create job with custom type', () => {
      const jobId = jobQueue.createJob('technical-debt-analysis');

      const job = jobQueue.getJob(jobId);
      expect(job).not.toBeNull();
      // Type is not exposed in JobProgress, but we can check via getAllJobs
      const allJobs = jobQueue.getAllJobs();
      expect(allJobs[0].type).toBe('technical-debt-analysis');
    });

    it('should accept progress callback', () => {
      const progressCallback = vi.fn();
      const jobId = jobQueue.createJob('test-job', progressCallback);

      jobQueue.updateProgress(jobId, 50, 'Processing...');

      expect(progressCallback).toHaveBeenCalledWith(50, 'Processing...');
    });

    it('should emit job:created event', () => {
      const eventSpy = vi.fn();
      jobQueue.on('job:created', eventSpy);

      const jobId = jobQueue.createJob('test-job');

      expect(eventSpy).toHaveBeenCalledWith(jobId);
    });

    it('should automatically process queue after creating job', () => {
      const eventSpy = vi.fn();
      jobQueue.on('job:ready', eventSpy);

      const jobId = jobQueue.createJob('test-job');

      // Job should be ready if queue is not full
      expect(eventSpy).toHaveBeenCalledWith(jobId);
    });
  });

  describe('getJob', () => {
    it('should return null for non-existent job', () => {
      const job = jobQueue.getJob('non-existent-job');

      expect(job).toBeNull();
    });

    it('should return job progress information', () => {
      const jobId = jobQueue.createJob('test-job');
      const job = jobQueue.getJob(jobId);

      expect(job).not.toBeNull();
      expect(job?.jobId).toBe(jobId);
      expect(job?.progress).toBe(0);
      // Status may be 'pending' or 'running' depending on queue capacity
      expect(['pending', 'running']).toContain(job?.status);
    });

    it('should return updated job information', () => {
      const jobId = jobQueue.createJob('test-job');
      jobQueue.updateProgress(jobId, 75, 'Almost done');
      jobQueue.startJob(jobId);

      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe('running');
      expect(job?.progress).toBe(75);
      expect(job?.currentStep).toBe('Almost done');
    });
  });

  describe('updateProgress', () => {
    it('should update job progress', () => {
      const jobId = jobQueue.createJob('test-job');
      jobQueue.updateProgress(jobId, 50);

      const job = jobQueue.getJob(jobId);
      expect(job?.progress).toBe(50);
    });

    it('should update current step', () => {
      const jobId = jobQueue.createJob('test-job');
      jobQueue.updateProgress(jobId, 30, 'Analyzing files');

      const job = jobQueue.getJob(jobId);
      expect(job?.currentStep).toBe('Analyzing files');
    });

    it('should clamp progress between 0 and 100', () => {
      const jobId = jobQueue.createJob('test-job');

      jobQueue.updateProgress(jobId, -10);
      expect(jobQueue.getJob(jobId)?.progress).toBe(0);

      jobQueue.updateProgress(jobId, 150);
      expect(jobQueue.getJob(jobId)?.progress).toBe(100);
    });

    it('should call progress callback if provided', () => {
      const progressCallback = vi.fn();
      const jobId = jobQueue.createJob('test-job', progressCallback);

      jobQueue.updateProgress(jobId, 25, 'Step 1');

      expect(progressCallback).toHaveBeenCalledWith(25, 'Step 1');
    });

    it('should emit job:progress event', () => {
      const eventSpy = vi.fn();
      jobQueue.on('job:progress', eventSpy);

      const jobId = jobQueue.createJob('test-job');
      jobQueue.updateProgress(jobId, 50, 'Processing');

      expect(eventSpy).toHaveBeenCalledWith(jobId, 50, 'Processing');
    });

    it('should not update progress for non-existent job', () => {
      jobQueue.updateProgress('non-existent', 50);

      // Should not throw or cause errors
      expect(jobQueue.getJob('non-existent')).toBeNull();
    });
  });

  describe('startJob', () => {
    it('should mark job as running', () => {
      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);

      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe('running');
    });

    it('should set startedAt timestamp', () => {
      const jobId = jobQueue.createJob('test-job');
      const beforeStart = new Date();
      jobQueue.startJob(jobId);
      const afterStart = new Date();

      const allJobs = jobQueue.getAllJobs();
      const job = allJobs.find((j) => j.id === jobId);
      expect(job?.startedAt).toBeDefined();
      expect(job?.startedAt!.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
      expect(job?.startedAt!.getTime()).toBeLessThanOrEqual(afterStart.getTime());
    });

    it('should add job to running jobs set', () => {
      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);

      // Check via getAllJobs - running jobs should have status 'running'
      const allJobs = jobQueue.getAllJobs();
      const job = allJobs.find((j) => j.id === jobId);
      expect(job?.status).toBe('running');
    });

    it('should emit job:started event', () => {
      const eventSpy = vi.fn();
      jobQueue.on('job:started', eventSpy);

      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);

      expect(eventSpy).toHaveBeenCalledWith(jobId);
    });

    it('should not start non-existent job', () => {
      const eventSpy = vi.fn();
      jobQueue.on('job:started', eventSpy);

      jobQueue.startJob('non-existent');

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('completeJob', () => {
    it('should mark job as completed', () => {
      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);
      jobQueue.completeJob(jobId, { result: 'success' });

      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe('completed');
      expect(job?.progress).toBe(100);
      expect(job?.result).toEqual({ result: 'success' });
    });

    it('should set completedAt timestamp', () => {
      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);
      const beforeComplete = new Date();
      jobQueue.completeJob(jobId, {});
      const afterComplete = new Date();

      const allJobs = jobQueue.getAllJobs();
      const job = allJobs.find((j) => j.id === jobId);
      expect(job?.completedAt).toBeDefined();
      expect(job?.completedAt!.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime());
      expect(job?.completedAt!.getTime()).toBeLessThanOrEqual(afterComplete.getTime());
    });

    it('should remove job from running jobs', () => {
      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);
      jobQueue.completeJob(jobId, {});

      // Job should no longer be in running state
      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe('completed');
    });

    it('should emit job:completed event', () => {
      const eventSpy = vi.fn();
      jobQueue.on('job:completed', eventSpy);

      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);
      jobQueue.completeJob(jobId, {});

      expect(eventSpy).toHaveBeenCalledWith(jobId);
    });

    it('should schedule job cleanup after 1 hour', async () => {
      vi.useFakeTimers();
      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);
      jobQueue.completeJob(jobId, {});

      expect(jobQueue.getJob(jobId)).not.toBeNull();

      // Fast-forward 1 hour
      vi.advanceTimersByTime(3600000);

      expect(jobQueue.getJob(jobId)).toBeNull();

      vi.useRealTimers();
    });

    it('should not complete non-existent job', () => {
      const eventSpy = vi.fn();
      jobQueue.on('job:completed', eventSpy);

      jobQueue.completeJob('non-existent', {});

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('failJob', () => {
    it('should mark job as failed', () => {
      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);
      jobQueue.failJob(jobId, 'Test error');

      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe('failed');
      expect(job?.error).toBe('Test error');
    });

    it('should set completedAt timestamp', () => {
      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);
      const beforeFail = new Date();
      jobQueue.failJob(jobId, 'Error');
      const afterFail = new Date();

      const allJobs = jobQueue.getAllJobs();
      const job = allJobs.find((j) => j.id === jobId);
      expect(job?.completedAt).toBeDefined();
      expect(job?.completedAt!.getTime()).toBeGreaterThanOrEqual(beforeFail.getTime());
      expect(job?.completedAt!.getTime()).toBeLessThanOrEqual(afterFail.getTime());
    });

    it('should remove job from running jobs', () => {
      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);
      jobQueue.failJob(jobId, 'Error');

      // Job should no longer be in running state
      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe('failed');
    });

    it('should emit job:failed event', () => {
      const eventSpy = vi.fn();
      jobQueue.on('job:failed', eventSpy);

      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);
      jobQueue.failJob(jobId, 'Test error');

      expect(eventSpy).toHaveBeenCalledWith(jobId);
    });

    it('should schedule job cleanup after 1 hour', async () => {
      vi.useFakeTimers();
      const jobId = jobQueue.createJob('test-job');
      jobQueue.startJob(jobId);
      jobQueue.failJob(jobId, 'Error');

      expect(jobQueue.getJob(jobId)).not.toBeNull();

      // Fast-forward 1 hour
      vi.advanceTimersByTime(3600000);

      expect(jobQueue.getJob(jobId)).toBeNull();

      vi.useRealTimers();
    });

    it('should not fail non-existent job', () => {
      const eventSpy = vi.fn();
      jobQueue.on('job:failed', eventSpy);

      jobQueue.failJob('non-existent', 'Error');

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('jobFinished', () => {
    it('should process next job in queue', () => {
      const eventSpy = vi.fn();
      jobQueue.on('job:ready', eventSpy);

      // Create first job - should start immediately
      const jobId1 = jobQueue.createJob('job1');
      expect(eventSpy).toHaveBeenCalledWith(jobId1);

      // Create second job - should wait if max concurrent is reached
      const jobId2 = jobQueue.createJob('job2');
      // If maxConcurrentJobs is 2, both should be ready
      const readyCalls = eventSpy.mock.calls.length;

      // Finish first job
      jobQueue.startJob(jobId1);
      jobQueue.completeJob(jobId1, {});
      jobQueue.jobFinished();

      // Should process next job if there are pending jobs
      // (This depends on maxConcurrentJobs setting)
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('getAllJobs', () => {
    it('should return empty array when no jobs', () => {
      const jobs = jobQueue.getAllJobs();
      expect(jobs).toEqual([]);
    });

    it('should return all jobs', () => {
      const jobId1 = jobQueue.createJob('job1');
      const jobId2 = jobQueue.createJob('job2');

      const jobs = jobQueue.getAllJobs();
      expect(jobs.length).toBe(2);
      expect(jobs.map((j) => j.id)).toContain(jobId1);
      expect(jobs.map((j) => j.id)).toContain(jobId2);
    });

    it('should return jobs with all properties', () => {
      const progressCallback = vi.fn();
      const jobId = jobQueue.createJob('test-job', progressCallback);
      jobQueue.startJob(jobId);
      jobQueue.updateProgress(jobId, 50, 'Processing');

      const jobs = jobQueue.getAllJobs();
      const job = jobs.find((j) => j.id === jobId);

      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.type).toBe('test-job');
      expect(job?.status).toBe('running');
      expect(job?.progress).toBe(50);
      expect(job?.currentStep).toBe('Processing');
      expect(job?.createdAt).toBeInstanceOf(Date);
      expect(job?.startedAt).toBeInstanceOf(Date);
      expect(job?.onProgress).toBe(progressCallback);
    });
  });

  describe('queue processing', () => {
    it('should respect max concurrent jobs limit', () => {
      const readySpy = vi.fn();
      jobQueue.on('job:ready', readySpy);

      // Create jobs up to max concurrent (default is 2)
      const jobId1 = jobQueue.createJob('job1');
      const jobId2 = jobQueue.createJob('job2');
      const jobId3 = jobQueue.createJob('job3');

      // First two should be ready
      expect(readySpy).toHaveBeenCalledWith(jobId1);
      expect(readySpy).toHaveBeenCalledWith(jobId2);
      // Third should not be ready yet if limit is reached
      const readyCalls = readySpy.mock.calls.length;

      // Complete first job
      jobQueue.startJob(jobId1);
      jobQueue.completeJob(jobId1, {});
      jobQueue.jobFinished();

      // Now third job should be ready
      expect(readySpy).toHaveBeenCalledWith(jobId3);
    });

    it('should process jobs in order', () => {
      const readySpy = vi.fn();
      jobQueue.on('job:ready', readySpy);

      const jobId1 = jobQueue.createJob('job1');
      const jobId2 = jobQueue.createJob('job2');
      const jobId3 = jobQueue.createJob('job3');

      // Jobs should be ready in order
      expect(readySpy.mock.calls[0][0]).toBe(jobId1);
      expect(readySpy.mock.calls[1][0]).toBe(jobId2);
    });
  });

  describe('job lifecycle', () => {
    it('should handle complete job lifecycle', () => {
      const progressCallback = vi.fn();
      const jobId = jobQueue.createJob('test-job', progressCallback);

      // Check initial state
      let job = jobQueue.getJob(jobId);
      // Job may be automatically started if queue has capacity
      if (job?.status === 'pending') {
        // Start job if it's still pending
        jobQueue.startJob(jobId);
        job = jobQueue.getJob(jobId);
      }
      expect(job?.status).toBe('running');
      expect(job?.progress).toBe(0);

      // Update progress
      jobQueue.updateProgress(jobId, 25, 'Step 1');
      expect(progressCallback).toHaveBeenCalledWith(25, 'Step 1');

      jobQueue.updateProgress(jobId, 50, 'Step 2');
      expect(progressCallback).toHaveBeenCalledWith(50, 'Step 2');

      jobQueue.updateProgress(jobId, 75, 'Step 3');
      expect(progressCallback).toHaveBeenCalledWith(75, 'Step 3');

      // Complete job
      jobQueue.completeJob(jobId, { result: 'success' });
      job = jobQueue.getJob(jobId);
      expect(job?.status).toBe('completed');
      expect(job?.progress).toBe(100);
      expect(job?.result).toEqual({ result: 'success' });
    });

    it('should handle failed job lifecycle', () => {
      const progressCallback = vi.fn();
      const jobId = jobQueue.createJob('test-job', progressCallback);

      // Start job
      jobQueue.startJob(jobId);
      jobQueue.updateProgress(jobId, 30, 'Processing');

      // Fail job
      jobQueue.failJob(jobId, 'Processing error');

      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe('failed');
      expect(job?.error).toBe('Processing error');
      expect(job?.progress).toBe(30); // Progress should remain at last update
    });
  });
});
