import { Queue, QueueEvents } from 'bullmq';
import { CONFIG } from './config.js';
import Redis from 'ioredis';

const connection = new Redis(CONFIG.redisUrl, {
  maxRetriesPerRequest: null,
});

export interface JobData {
  type: 'video-convert' | 'audio-extract' | 'frame-extract' | 'audio-convert' | 'image-convert' | 'probe';
  inputPath: string;
  options?: Record<string, any>;
}

export interface JobResult {
  success: boolean;
  mode?: 'stateless' | 's3';
  outputPath?: string;
  outputPaths?: string[];
  metadata?: any;
  url?: string;
  urls?: string[];
  error?: string;
}

export const ffmpegQueue = new Queue<JobData, JobResult>('ffmpeg-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 3600, // Keep completed jobs for 1 hour
    },
    removeOnFail: {
      count: 50,
    },
  },
});

export const queueEvents = new QueueEvents('ffmpeg-processing', { connection });

export async function addJob(data: JobData): Promise<string> {
  const job = await ffmpegQueue.add('process', data);
  return job.id!;
}

export async function getJobStatus(jobId: string) {
  const job = await ffmpegQueue.getJob(jobId);
  
  if (!job) {
    return { status: 'not-found' };
  }

  const state = await job.getState();
  
  return {
    status: state,
    progress: job.progress,
    result: job.returnvalue,
    failedReason: job.failedReason,
  };
}
