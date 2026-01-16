# FFmpeg REST API

A REST API that wraps FFmpeg for media processing operations. Convert videos to MP4, extract audio tracks, extract frames, convert audio to MP3/WAV, convert images to JPG, and probe media metadata. Built with Node.js, Hono, and BullMQ for reliable async job processing.

## Features

- **Video Conversion**: Convert any video format to MP4 with customizable codec, bitrate, FPS, and resolution
- **Audio Extraction**: Extract audio tracks from video files with support for mono/stereo channels
- **Frame Extraction**: Extract single frames, multiple frames, or frames at specific FPS
- **Audio Conversion**: Convert audio files to MP3 or WAV format
- **Image Conversion**: Convert images to JPG format with quality control
- **Media Probing**: Get detailed metadata about media files
- **Async Processing**: All operations are processed asynchronously using BullMQ
- **Dual Storage Modes**: Stateless (direct response) or S3-compatible storage
- **OpenAPI Documentation**: Full API documentation with type-safe validation
- **Scalable**: Configurable worker concurrency for optimal resource utilization

## Storage Modes

### Stateless Mode (Default)

Files are processed and returned directly in the HTTP response. Simple and straightforward for immediate consumption.

**Cost Consideration**: On Railway, stateless mode is cheaper than running S3 Mode unless you have free egress at your S3-storage provider (like Cloudflare R2). Railway charges **$0.05/GB egress** vs S3's typical **$0.09/GB**, but you trade off file persistence - processed files aren't stored for later retrieval.

### S3 Mode

Processed files are uploaded to S3-compatible storage and a URL is returned. This mode significantly reduces egress bandwidth costs since users download the processed files directly from S3 rather than through your API server.

**Why Cloudflare R2?** R2 is S3-compatible and offers **no egress fees**, which dramatically lowers costs when serving processed media from your bucket via Cloudflare's global network.

## Quick Start

### Prerequisites

- Node.js 20+
- FFmpeg installed and available in PATH
- Redis server running

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ffmpeg-rest-api
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```bash
# Required
PORT=3000
REDIS_URL=redis://localhost:6379
WORKER_CONCURRENCY=5
STORAGE_MODE=stateless

# For S3 mode
STORAGE_MODE=s3
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=ffmpeg-rest
S3_ACCESS_KEY_ID=<your-access-key>
S3_SECRET_ACCESS_KEY=<your-secret-key>
S3_PUBLIC_URL=https://media.yourdomain.com
S3_PATH_PREFIX=ffmpeg-rest
```

### Development

Run in development mode with hot reload:

```bash
# Terminal 1: Start Redis (if not already running)
redis-server

# Terminal 2: Start worker
npm run dev -- src/worker.ts

# Terminal 3: Start API server
npm run dev
```

### Production

Build and run in production:

```bash
# Build TypeScript
npm run build

# Start worker (in separate terminal or process manager)
npm run worker

# Start API server
npm start
```

### Docker

Build and run with Docker:

```bash
# Build image
docker build -t ffmpeg-rest-api .

# Run container
docker run -p 3000:3000 \
  -e REDIS_URL=redis://your-redis-host:6379 \
  -e STORAGE_MODE=stateless \
  ffmpeg-rest-api
```

### Deploy to Railway

1. Click the deploy button on [Railway Template](https://railway.com/deploy/ffmpeg-rest-api)
2. Configure environment variables:
   - Set `STORAGE_MODE` to `stateless` or `s3`
   - If using S3 mode, configure S3 credentials
3. Deploy!

Railway will automatically provision a Redis instance for you.

## API Documentation

### Endpoints

#### Health Check
```
GET /health
```

Returns service health and storage mode.

#### Video Conversion
```
POST /video/convert
Content-Type: multipart/form-data

file: <video file>
options: {
  "codec": "libx264",
  "videoBitrate": "1000k",
  "audioBitrate": "128k",
  "fps": 30,
  "resolution": "1280x720"
}
```

#### Audio Extraction
```
POST /audio/extract
Content-Type: multipart/form-data

file: <video file>
options: {
  "track": 0,
  "channels": 2
}
```

#### Frame Extraction
```
POST /video/frames
Content-Type: multipart/form-data

file: <video file>
options: {
  "timestamp": "00:00:05",  // Extract single frame at timestamp
  "count": 10,              // Or extract N frames
  "fps": 1                  // Or extract frames at specific FPS
}
```

#### Audio Conversion
```
POST /audio/convert
Content-Type: multipart/form-data

file: <audio file>
options: {
  "format": "mp3",
  "bitrate": "192k",
  "sampleRate": 44100
}
```

#### Image Conversion
```
POST /image/convert
Content-Type: multipart/form-data

file: <image file>
options: {
  "quality": 2  // 1-31, lower is better quality
}
```

#### Media Probe
```
POST /media/probe
Content-Type: multipart/form-data

file: <media file>
```

#### Job Status
```
GET /job/{jobId}
```

Returns job status and result.

#### Job Result (Stateless Mode Only)
```
GET /job/{jobId}/result
```

Downloads the processed file.

### OpenAPI Documentation

Access the full OpenAPI specification at:
```
GET /openapi.json
```

## Usage Examples

### cURL Examples

**Convert video to MP4:**
```bash
curl -X POST http://localhost:3000/video/convert \
  -F "file=@input.avi" \
  -F 'options={"videoBitrate":"1000k","resolution":"1280x720"}'
```

**Extract audio:**
```bash
curl -X POST http://localhost:3000/audio/extract \
  -F "file=@video.mp4" \
  -F 'options={"channels":2}'
```

**Extract frames:**
```bash
curl -X POST http://localhost:3000/video/frames \
  -F "file=@video.mp4" \
  -F 'options={"count":5}'
```

**Check job status:**
```bash
curl http://localhost:3000/job/{jobId}
```

**Download result (stateless mode):**
```bash
curl http://localhost:3000/job/{jobId}/result -o output.mp4
```

### JavaScript/TypeScript Example

```typescript
const formData = new FormData();
formData.append('file', videoFile);
formData.append('options', JSON.stringify({
  videoBitrate: '1000k',
  resolution: '1280x720',
}));

// Submit job
const response = await fetch('http://localhost:3000/video/convert', {
  method: 'POST',
  body: formData,
});

const { jobId } = await response.json();

// Poll for completion
let status;
do {
  const statusResponse = await fetch(`http://localhost:3000/job/${jobId}`);
  status = await statusResponse.json();
  await new Promise(resolve => setTimeout(resolve, 1000));
} while (status.status !== 'completed' && status.status !== 'failed');

// Get result
if (status.status === 'completed') {
  if (status.result.mode === 's3') {
    console.log('Download from:', status.result.url);
  } else {
    const fileResponse = await fetch(`http://localhost:3000/job/${jobId}/result`);
    const blob = await fileResponse.blob();
    // Use the blob...
  }
}
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | Yes |
| `WORKER_CONCURRENCY` | Number of concurrent jobs | `5` | No |
| `STORAGE_MODE` | Storage mode: `stateless` or `s3` | `stateless` | No |
| `S3_ENDPOINT` | S3-compatible endpoint | - | If S3 mode |
| `S3_REGION` | S3 region | `auto` | If S3 mode |
| `S3_BUCKET` | S3 bucket name | - | If S3 mode |
| `S3_ACCESS_KEY_ID` | S3 access key | - | If S3 mode |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | - | If S3 mode |
| `S3_PUBLIC_URL` | Public CDN URL for serving files | - | No |
| `S3_PATH_PREFIX` | Prefix for S3 object keys | `ffmpeg-rest` | No |

## Architecture

- **Hono**: Fast, lightweight web framework with type-safe routing
- **BullMQ**: Redis-based queue for reliable async job processing
- **Fluent-FFmpeg**: Node.js wrapper for FFmpeg
- **Zod**: Type-safe validation and OpenAPI schema generation
- **AWS SDK S3**: S3-compatible storage integration

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions, please open an issue on GitHub.
# ffmpeg-rest-api
