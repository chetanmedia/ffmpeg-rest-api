import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Ensure temp directory exists
const TEMP_DIR = join(process.cwd(), 'temp');
await fs.mkdir(TEMP_DIR, { recursive: true });

export interface VideoConversionOptions {
  inputPath: string;
  codec?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  fps?: number;
  resolution?: string;
}

export interface AudioExtractionOptions {
  inputPath: string;
  track?: number;
  channels?: 1 | 2;
}

export interface FrameExtractionOptions {
  inputPath: string;
  timestamp?: string;
  count?: number;
  fps?: number;
}

export interface AudioConversionOptions {
  inputPath: string;
  format: 'mp3' | 'wav';
  bitrate?: string;
  sampleRate?: number;
}

export interface ImageConversionOptions {
  inputPath: string;
  quality?: number;
}

export interface MediaInfo {
  format: {
    filename: string;
    format_name: string;
    duration: number;
    size: number;
    bit_rate: number;
  };
  streams: Array<{
    codec_type: string;
    codec_name: string;
    width?: number;
    height?: number;
    sample_rate?: string;
    channels?: number;
  }>;
}

export async function convertVideoToMp4(options: VideoConversionOptions): Promise<string> {
  const outputPath = join(TEMP_DIR, `${randomUUID()}.mp4`);

  return new Promise((resolve, reject) => {
    let command = ffmpeg(options.inputPath)
      .output(outputPath)
      .videoCodec(options.codec || 'libx264');

    if (options.videoBitrate) {
      command = command.videoBitrate(options.videoBitrate);
    }

    if (options.audioBitrate) {
      command = command.audioBitrate(options.audioBitrate);
    }

    if (options.fps) {
      command = command.fps(options.fps);
    }

    if (options.resolution) {
      command = command.size(options.resolution);
    }

    command
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function extractAudio(options: AudioExtractionOptions): Promise<string> {
  const outputPath = join(TEMP_DIR, `${randomUUID()}.mp3`);

  return new Promise((resolve, reject) => {
    let command = ffmpeg(options.inputPath)
      .output(outputPath)
      .noVideo();

    if (options.track !== undefined) {
      command = command.audioFilters(`map 0:a:${options.track}`);
    }

    if (options.channels) {
      command = command.audioChannels(options.channels);
    }

    command
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function extractFrames(options: FrameExtractionOptions): Promise<string[]> {
  const framePaths: string[] = [];

  if (options.timestamp) {
    // Extract single frame at timestamp
    const outputPath = join(TEMP_DIR, `${randomUUID()}.jpg`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(options.inputPath)
        .screenshots({
          timestamps: [options.timestamp!],
          filename: basename(outputPath),
          folder: TEMP_DIR,
        })
        .on('end', () => resolve())
        .on('error', reject);
    });

    framePaths.push(outputPath);
  } else if (options.count) {
    // Extract multiple frames evenly distributed
    for (let i = 0; i < options.count; i++) {
      const outputPath = join(TEMP_DIR, `${randomUUID()}.jpg`);
      framePaths.push(outputPath);
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(options.inputPath)
        .screenshots({
          count: options.count,
          folder: TEMP_DIR,
          filename: framePaths.map(p => basename(p))[0], // Will use sequential naming
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
  } else if (options.fps) {
    // Extract frames at specific FPS
    const outputPattern = join(TEMP_DIR, `${randomUUID()}-%03d.jpg`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(options.inputPath)
        .output(outputPattern)
        .outputOptions([`-vf fps=${options.fps}`])
        .on('end', async () => {
          // Find all generated frames
          const files = await fs.readdir(TEMP_DIR);
          const pattern = basename(outputPattern).replace('%03d', '');
          const matchingFiles = files.filter(f => f.startsWith(pattern.split('-')[0]));
          framePaths.push(...matchingFiles.map(f => join(TEMP_DIR, f)));
          resolve();
        })
        .on('error', reject)
        .run();
    });
  }

  return framePaths;
}

export async function convertAudio(options: AudioConversionOptions): Promise<string> {
  const outputPath = join(TEMP_DIR, `${randomUUID()}.${options.format}`);

  return new Promise((resolve, reject) => {
    let command = ffmpeg(options.inputPath)
      .output(outputPath)
      .format(options.format);

    if (options.bitrate) {
      command = command.audioBitrate(options.bitrate);
    }

    if (options.sampleRate) {
      command = command.audioFrequency(options.sampleRate);
    }

    command
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function convertImageToJpg(options: ImageConversionOptions): Promise<string> {
  const outputPath = join(TEMP_DIR, `${randomUUID()}.jpg`);

  return new Promise((resolve, reject) => {
    let command = ffmpeg(options.inputPath)
      .output(outputPath);

    if (options.quality) {
      command = command.outputOptions([`-q:v ${options.quality}`]);
    }

    command
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function probeMedia(inputPath: string): Promise<MediaInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        format: {
          filename: metadata.format.filename || '',
          format_name: metadata.format.format_name || '',
          duration: parseFloat(String(metadata.format.duration || '0')),
          size: parseInt(String(metadata.format.size || '0'), 10),
          bit_rate: parseInt(String(metadata.format.bit_rate || '0'), 10),
        },
        streams: metadata.streams.map(stream => ({
          codec_type: stream.codec_type || '',
          codec_name: stream.codec_name || '',
          width: stream.width,
          height: stream.height,
          sample_rate: stream.sample_rate ? String(stream.sample_rate) : undefined,
          channels: stream.channels,
        })),
      });
    });
  });
}

export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to cleanup file ${filePath}:`, error);
  }
}

function basename(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}
