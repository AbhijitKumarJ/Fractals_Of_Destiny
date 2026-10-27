export interface OfflineWebCodecsExportConfig {
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  bitrate?: number;
  renderFrameAtTime: (timestampSec: number) => void;
  onProgress?: (renderedFrames: number, totalFrames: number) => void;
}

export interface OfflineEncodedChunksResult {
  encodedChunks: Uint8Array[];
  totalFrames: number;
  codec: string;
  fps: number;
}

export async function renderOfflineWithWebCodecs(
  compositeCanvas: HTMLCanvasElement,
  config: OfflineWebCodecsExportConfig
): Promise<OfflineEncodedChunksResult> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    throw new Error(
      'WebCodecs API (VideoEncoder / VideoFrame) is not supported in this browser.'
    );
  }

  const totalFrames = Math.ceil(config.durationSeconds * config.fps);
  const encodedChunks: Uint8Array[] = [];
  const codec = 'avc1.42001f';

  const encoder = new VideoEncoder({
    output: (chunk) => {
      const buffer = new Uint8Array(chunk.byteLength);
      chunk.copyTo(buffer);
      encodedChunks.push(buffer);
    },
    error: (err) => {
      throw err;
    }
  });

  encoder.configure({
    codec,
    width: config.width,
    height: config.height,
    bitrate: config.bitrate || 12_000_000,
    framerate: config.fps
  });

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const tSec = frameIdx / config.fps;
    config.renderFrameAtTime(tSec);

    const timestampMicros = Math.round(tSec * 1_000_000);
    const videoFrame = new VideoFrame(compositeCanvas, {
      timestamp: timestampMicros,
      duration: Math.round(1_000_000 / config.fps)
    });

    const isKeyFrame = frameIdx % (config.fps * 2) === 0;
    encoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();

    if (config.onProgress && frameIdx % 5 === 0) {
      config.onProgress(frameIdx + 1, totalFrames);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await encoder.flush();
  encoder.close();

  return {
    encodedChunks,
    totalFrames,
    codec,
    fps: config.fps
  };
}
