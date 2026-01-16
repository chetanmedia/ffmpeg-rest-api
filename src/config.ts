import { config } from 'dotenv';

config();

export const CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  storageMode: (process.env.STORAGE_MODE || 'stateless') as 'stateless' | 's3',
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    publicUrl: process.env.S3_PUBLIC_URL,
    pathPrefix: process.env.S3_PATH_PREFIX || 'ffmpeg-rest',
  },
} as const;

// Validate S3 configuration if S3 mode is enabled
if (CONFIG.storageMode === 's3') {
  const required = [
    'S3_ENDPOINT',
    'S3_BUCKET',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
  ];
  
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `S3 mode is enabled but missing required environment variables: ${missing.join(', ')}`
    );
  }
}
