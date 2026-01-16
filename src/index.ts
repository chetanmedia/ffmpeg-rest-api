import { serve } from '@hono/node-server';
import { app } from './routes.js';
import { CONFIG } from './config.js';

console.log(`Starting FFmpeg REST API...`);
console.log(`Storage mode: ${CONFIG.storageMode}`);
console.log(`Port: ${CONFIG.port}`);

serve({
  fetch: app.fetch,
  port: CONFIG.port,
});

console.log(`Server is running on http://localhost:${CONFIG.port}`);
console.log(`OpenAPI documentation: http://localhost:${CONFIG.port}/openapi.json`);
console.log(`Health check: http://localhost:${CONFIG.port}/health`);
