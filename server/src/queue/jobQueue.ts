import { EventEmitter } from 'events';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobProgress {
  jobId: string;
  status: JobStatus;
  progress: number; // 0-100
  currentStep?: string;
  error?: string;
  result?: any;
}

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  currentStep?: string;
  error?: string;
  result?: any;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  onProgress?: (progress: number, step?: string) => void;
}

class JobQueue extends EventEmitter {
  private jobs: Map<string, Job> = new Map();
  private runningJobs: Set<string> = new Set();
  private maxConcurrentJobs = 2; // Limit concurrent technical debt analyses

  /**
   * Create a new job and add it to the queue
   */
  createJob(type: string, onProgress?: (progress: number, step?: string) => void): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job: Job = {
      id: jobId,
      type,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      onProgress,
    };

    this.jobs.set(jobId, job);
    console.log(
      `[Job Queue] Job ${jobId} created (type: ${type}, queue size: ${this.jobs.size}, running: ${this.runningJobs.size})`
    );
    this.emit('job:created', jobId);
    this.processQueue();

    return jobId;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): JobProgress | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      error: job.error,
      result: job.result,
    };
  }

  /**
   * Update job progress
   */
  updateProgress(jobId: string, progress: number, step?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = Math.min(100, Math.max(0, progress));
    if (step) {
      job.currentStep = step;
    }

    // Log progress
    if (step) {
      console.log(`[Job ${jobId}] ${step} - ${Math.round(progress)}%`);
    }

    if (job.onProgress) {
      job.onProgress(job.progress, job.currentStep);
    }

    this.emit('job:progress', jobId, job.progress, job.currentStep);
  }

  /**
   * Mark job as running
   */
  startJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.startedAt = new Date();
    this.runningJobs.add(jobId);
    console.log(`[Job Queue] Job ${jobId} started (type: ${job.type})`);
    this.emit('job:started', jobId);
  }

  /**
   * Mark job as completed
   */
  completeJob(jobId: string, result: any): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.progress = 100;
    job.result = result;
    job.completedAt = new Date();
    const duration = job.startedAt
      ? Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000)
      : 0;
    this.runningJobs.delete(jobId);
    console.log(`[Job Queue] Job ${jobId} completed in ${duration}s`);
    this.emit('job:completed', jobId);

    // Clean up old jobs after 1 hour
    setTimeout(() => {
      this.jobs.delete(jobId);
    }, 3600000);
  }

  /**
   * Mark job as failed
   */
  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = error;
    job.completedAt = new Date();
    const duration = job.startedAt
      ? Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000)
      : 0;
    this.runningJobs.delete(jobId);
    console.error(`[Job Queue] Job ${jobId} failed after ${duration}s: ${error}`);
    this.emit('job:failed', jobId);

    // Clean up old jobs after 1 hour
    setTimeout(() => {
      this.jobs.delete(jobId);
    }, 3600000);
  }

  /**
   * Process the queue
   */
  private processQueue(): void {
    if (this.runningJobs.size >= this.maxConcurrentJobs) {
      return; // Already at max capacity
    }

    // Find next pending job
    const pendingJob = Array.from(this.jobs.values()).find((job) => job.status === 'pending');

    if (pendingJob) {
      this.startJob(pendingJob.id);
      this.emit('job:ready', pendingJob.id);
    }
  }

  /**
   * Called when a job finishes to process next in queue
   */
  jobFinished(): void {
    this.processQueue();
  }

  /**
   * Get all jobs (for debugging)
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }
}

export const jobQueue = new JobQueue();
