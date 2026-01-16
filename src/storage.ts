import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CONFIG } from './config.js';
import { readFile } from 'fs/promises';
import { basename } from 'path';
import { randomUUID } from 'crypto';

let s3Client: S3Client | null = null;

if (CONFIG.storageMode === 's3') {
  s3Client = new S3Client({
    endpoint: CONFIG.s3.endpoint,
    region: CONFIG.s3.region,
    credentials: {
      accessKeyId: CONFIG.s3.accessKeyId!,
      secretAccessKey: CONFIG.s3.secretAccessKey!,
    },
  });
}

export interface StorageResult {
  mode: 'stateless' | 's3';
  url?: string;
  filePath?: string;
}

export async function uploadToS3(filePath: string, contentType: string): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }

  const fileBuffer = await readFile(filePath);
  const fileName = basename(filePath);
  const key = `${CONFIG.s3.pathPrefix}/${randomUUID()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: CONFIG.s3.bucket!,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return public URL if configured, otherwise return S3 URL
  if (CONFIG.s3.publicUrl) {
    return `${CONFIG.s3.publicUrl}/${key}`;
  }

  return `${CONFIG.s3.endpoint}/${CONFIG.s3.bucket}/${key}`;
}

export function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}
