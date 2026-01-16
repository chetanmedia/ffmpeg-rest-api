import { Worker, Job } from 'bullmq';
import { CONFIG } from './config.js';
import {
  convertVideoToMp4,
  extractAudio,
  extractFrames,
  convertAudio,
  convertImageToJpg,
  probeMedia,
  cleanupFile,
} from './ffmpeg.js';
import { uploadToS3, getContentType } from './storage.js';
import type { JobData, JobResult } from './queue.js';
import Redis from 'ioredis';

const connection = new Redis(CONFIG.redisUrl, {
  maxRetriesPerRequest: null,
});

async function processJob(job: Job<JobData>): Promise<JobResult> {
  const { type, inputPath, options = {} } = job.data;

  try {
    let result: JobResult;

    switch (type) {
      case 'video-convert': {
        const outputPath = await convertVideoToMp4({
          inputPath,
          ...options,
        });

        if (CONFIG.storageMode === 's3') {
          const url = await uploadToS3(outputPath, getContentType(outputPath));
          await cleanupFile(outputPath);
          result = { success: true, url, mode: 's3' };
        } else {
          result = { success: true, outputPath, mode: 'stateless' };
        }
        break;
      }

      case 'audio-extract': {
        const outputPath = await extractAudio({
          inputPath,
          ...options,
        });

        if (CONFIG.storageMode === 's3') {
          const url = await uploadToS3(outputPath, getContentType(outputPath));
          await cleanupFile(outputPath);
          result = { success: true, url, mode: 's3' };
        } else {
          result = { success: true, outputPath, mode: 'stateless' };
        }
        break;
      }

      case 'frame-extract': {
        const outputPaths = await extractFrames({
          inputPath,
          ...options,
        });

        if (CONFIG.storageMode === 's3') {
          const urls = await Promise.all(
            outputPaths.map(path => uploadToS3(path, getContentType(path)))
          );
          await Promise.all(outputPaths.map(cleanupFile));
          result = { success: true, urls, mode: 's3' };
        } else {
          result = { success: true, outputPaths, mode: 'stateless' };
        }
        break;
      }

      case 'audio-convert': {
        const outputPath = await convertAudio({
          inputPath,
          format: options.format || 'mp3',
          ...options,
        });

        if (CONFIG.storageMode === 's3') {
          const url = await uploadToS3(outputPath, getContentType(outputPath));
          await cleanupFile(outputPath);
          result = { success: true, url, mode: 's3' };
        } else {
          result = { success: true, outputPath, mode: 'stateless' };
        }
        break;
      }

      case 'image-convert': {
        const outputPath = await convertImageToJpg({
          inputPath,
          ...options,
        });

        if (CONFIG.storageMode === 's3') {
          const url = await uploadToS3(outputPath, getContentType(outputPath));
          await cleanupFile(outputPath);
          result = { success: true, url, mode: 's3' };
        } else {
          result = { success: true, outputPath, mode: 'stateless' };
        }
        break;
      }

      case 'probe': {
        const metadata = await probeMedia(inputPath);
        result = { success: true, metadata, mode: CONFIG.storageMode };
        break;
      }

      default:
        throw new Error(`Unknown job type: ${type}`);
    }

    // Cleanup input file
    await cleanupFile(inputPath);

    return result;
  } catch (error) {
    // Cleanup input file on error
    await cleanupFile(inputPath);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      mode: CONFIG.storageMode,
    };
  }
}

const worker = new Worker<JobData, JobResult>('ffmpeg-processing', processJob, {
  connection,
  concurrency: CONFIG.workerConcurrency,
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log(`Worker started with concurrency: ${CONFIG.workerConcurrency}`);
console.log(`Storage mode: ${CONFIG.storageMode}`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});
