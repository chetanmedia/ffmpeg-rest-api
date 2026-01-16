# Setup Guide

This guide will help you set up and run the FFmpeg REST API locally.

## Prerequisites

Before you begin, make sure you have the following installed:

1. **Node.js 20+** - [Download here](https://nodejs.org/)
2. **FFmpeg** - Install via your package manager:
   - macOS: `brew install ffmpeg`
   - Ubuntu/Debian: `sudo apt install ffmpeg`
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
3. **Redis** - Install via your package manager:
   - macOS: `brew install redis`
   - Ubuntu/Debian: `sudo apt install redis-server`
   - Windows: Use [WSL](https://docs.microsoft.com/en-us/windows/wsl/) or [Redis for Windows](https://github.com/tporadowski/redis)

## Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start Redis

In a new terminal window:

```bash
# macOS/Linux
redis-server

# Or if Redis is already running as a service, you can skip this
```

### Step 3: Start the Worker

In a new terminal window:

```bash
npm run dev -- src/worker.ts
```

You should see output like:
```
Worker started with concurrency: 5
Storage mode: stateless
```

### Step 4: Start the API Server

In another terminal window:

```bash
npm run dev
```

You should see output like:
```
Starting FFmpeg REST API...
Storage mode: stateless
Port: 3000
Server is running on http://localhost:3000
OpenAPI documentation: http://localhost:3000/openapi.json
Health check: http://localhost:3000/health
```

### Step 5: Test the API

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "storageMode": "stateless"
}
```

## Testing with Sample Files

To test the API with actual media processing:

1. Place a test video file (e.g., `test.mp4`) in the project directory
2. Use the example usage script:

```bash
# Make sure you have a test video file
curl -X POST http://localhost:3000/video/convert \
  -F "file=@test.mp4" \
  -F 'options={"videoBitrate":"1000k","resolution":"1280x720"}'
```

3. You'll receive a job ID. Check the status:

```bash
curl http://localhost:3000/job/{jobId}
```

4. Once completed, download the result:

```bash
curl http://localhost:3000/job/{jobId}/result -o output.mp4
```

## Production Deployment

### Building for Production

```bash
# Build TypeScript to JavaScript
npm run build

# Start worker
npm run worker &

# Start API server
npm start
```

### Using Docker

```bash
# Build image
docker build -t ffmpeg-rest-api .

# Run with docker-compose (recommended)
docker-compose up
```

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data

  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      - PORT=3000
      - REDIS_URL=redis://redis:6379
      - WORKER_CONCURRENCY=5
      - STORAGE_MODE=stateless
    depends_on:
      - redis

volumes:
  redis-data:
```

### Deploying to Railway

1. Push your code to GitHub
2. Visit [Railway](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add a Redis database from the Railway dashboard
6. Set environment variables:
   - `STORAGE_MODE`: `stateless` or `s3`
   - Configure S3 variables if using S3 mode
7. Deploy!

Railway will automatically:
- Build your Docker image
- Provision Redis
- Start your application
- Provide a public URL

## Configuring S3 Storage Mode

To use S3-compatible storage (like Cloudflare R2):

1. Update `.env`:

```bash
STORAGE_MODE=s3
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_PUBLIC_URL=https://media.yourdomain.com
S3_PATH_PREFIX=ffmpeg-rest
```

2. Restart the application

With S3 mode enabled:
- Processed files are uploaded to S3
- API returns URLs instead of files
- Significantly reduces bandwidth costs
- Files persist for long-term storage

## Troubleshooting

### "FFmpeg not found"

Make sure FFmpeg is installed and in your PATH:

```bash
ffmpeg -version
```

If not installed, install it using your package manager.

### "Redis connection failed"

Make sure Redis is running:

```bash
redis-cli ping
```

Should return `PONG`. If not, start Redis:

```bash
redis-server
```

### "Worker not processing jobs"

1. Check that the worker is running
2. Check Redis connection in worker logs
3. Verify queue name matches between API and worker

### Port already in use

If port 3000 is already in use, change it in `.env`:

```bash
PORT=3001
```

## API Endpoints Summary

- `GET /health` - Health check
- `POST /video/convert` - Convert video to MP4
- `POST /audio/extract` - Extract audio from video
- `POST /video/frames` - Extract frames from video
- `POST /audio/convert` - Convert audio format
- `POST /image/convert` - Convert image to JPG
- `POST /media/probe` - Get media metadata
- `GET /job/{jobId}` - Get job status
- `GET /job/{jobId}/result` - Download result (stateless mode)
- `GET /openapi.json` - OpenAPI documentation

## Next Steps

- Read the [README.md](README.md) for full API documentation
- Check out the [example-usage.sh](example-usage.sh) script
- Explore the OpenAPI documentation at `/openapi.json`
- Deploy to Railway for production use

## Support

For issues and questions:
- Check the [README.md](README.md)
- Open an issue on GitHub
- Read the inline code documentation
