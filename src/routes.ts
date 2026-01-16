import { Hono } from 'hono';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { addJob, getJobStatus } from './queue.js';
import { getContentType } from './storage.js';
import { CONFIG } from './config.js';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
await fs.mkdir(UPLOAD_DIR, { recursive: true });

export const app = new Hono();

// Helper function to save uploaded file
async function saveUploadedFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `${randomUUID()}-${file.name}`;
  const filePath = join(UPLOAD_DIR, fileName);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    storageMode: CONFIG.storageMode,
  });
});

// Video conversion route
app.post('/video/convert', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    const optionsStr = body.options as string | undefined;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const filePath = await saveUploadedFile(file);
    const options = optionsStr ? JSON.parse(optionsStr) : {};

    const jobId = await addJob({
      type: 'video-convert',
      inputPath: filePath,
      options,
    });

    return c.json({ jobId, status: 'queued' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

// Audio extraction route
app.post('/audio/extract', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    const optionsStr = body.options as string | undefined;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const filePath = await saveUploadedFile(file);
    const options = optionsStr ? JSON.parse(optionsStr) : {};

    const jobId = await addJob({
      type: 'audio-extract',
      inputPath: filePath,
      options,
    });

    return c.json({ jobId, status: 'queued' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

// Frame extraction route
app.post('/video/frames', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    const optionsStr = body.options as string | undefined;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const filePath = await saveUploadedFile(file);
    const options = optionsStr ? JSON.parse(optionsStr) : {};

    const jobId = await addJob({
      type: 'frame-extract',
      inputPath: filePath,
      options,
    });

    return c.json({ jobId, status: 'queued' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

// Audio conversion route
app.post('/audio/convert', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    const optionsStr = body.options as string | undefined;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const filePath = await saveUploadedFile(file);
    const options = optionsStr ? JSON.parse(optionsStr) : {};

    const jobId = await addJob({
      type: 'audio-convert',
      inputPath: filePath,
      options,
    });

    return c.json({ jobId, status: 'queued' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

// Image conversion route
app.post('/image/convert', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    const optionsStr = body.options as string | undefined;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const filePath = await saveUploadedFile(file);
    const options = optionsStr ? JSON.parse(optionsStr) : {};

    const jobId = await addJob({
      type: 'image-convert',
      inputPath: filePath,
      options,
    });

    return c.json({ jobId, status: 'queued' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

// Probe media route
app.post('/media/probe', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file as File;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const filePath = await saveUploadedFile(file);

    const jobId = await addJob({
      type: 'probe',
      inputPath: filePath,
    });

    return c.json({ jobId, status: 'queued' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

// Job status route
app.get('/job/:jobId', async (c) => {
  const { jobId } = c.req.param();
  const status = await getJobStatus(jobId);
  return c.json(status);
});

// Job result route (for stateless mode)
app.get('/job/:jobId/result', async (c) => {
  const { jobId } = c.req.param();
  const jobStatus = await getJobStatus(jobId);

  if (jobStatus.status !== 'completed') {
    return c.json({ error: 'Job not completed' }, 404);
  }

  const result = jobStatus.result;

  if (!result || !result.success) {
    return c.json({ error: result?.error || 'Job failed' }, 404);
  }

  if (result.mode === 's3') {
    return c.json({ error: 'Use the URL from job status for S3 mode' }, 400);
  }

  if (result.outputPath) {
    const fileBuffer = await fs.readFile(result.outputPath);
    const contentType = getContentType(result.outputPath);
    
    return c.body(fileBuffer, 200, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${result.outputPath.split('/').pop()}"`,
    });
  }

  return c.json({ error: 'No output file available' }, 404);
});

// API Documentation endpoint
app.get('/api/docs', (c) => {
  return c.json({
    openapi: '3.0.0',
    info: {
      title: 'FFmpeg REST API',
      version: '1.0.0',
      description: 'A REST API that wraps FFmpeg for media processing operations',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Service is healthy',
            },
          },
        },
      },
      '/video/convert': {
        post: {
          summary: 'Convert video to MP4',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    options: { type: 'string', description: 'JSON string with conversion options' },
                  },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Job created successfully',
            },
          },
        },
      },
      '/audio/extract': {
        post: {
          summary: 'Extract audio from video',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    options: { type: 'string', description: 'JSON string with extraction options' },
                  },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Job created successfully',
            },
          },
        },
      },
      '/video/frames': {
        post: {
          summary: 'Extract frames from video',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    options: { type: 'string', description: 'JSON string with frame extraction options' },
                  },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Job created successfully',
            },
          },
        },
      },
      '/audio/convert': {
        post: {
          summary: 'Convert audio format',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    options: { type: 'string', description: 'JSON string with format and options (must include format: "mp3" or "wav")' },
                  },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Job created successfully',
            },
          },
        },
      },
      '/image/convert': {
        post: {
          summary: 'Convert image to JPG',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    options: { type: 'string', description: 'JSON string with quality option' },
                  },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Job created successfully',
            },
          },
        },
      },
      '/media/probe': {
        post: {
          summary: 'Get media metadata',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                  },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Job created successfully',
            },
          },
        },
      },
      '/job/{jobId}': {
        get: {
          summary: 'Get job status',
          parameters: [
            {
              name: 'jobId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Job status retrieved',
            },
          },
        },
      },
      '/job/{jobId}/result': {
        get: {
          summary: 'Download job result (stateless mode only)',
          parameters: [
            {
              name: 'jobId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Result file',
            },
          },
        },
      },
    },
  });
});
