export interface RecordedVideoArtifact {
  url: string;
  mimeType: string;
  extension: 'mp4' | 'webm';
  sizeBytes: number;
}

export function probeSupportedVideoMimeType(): {
  mimeType: string;
  extension: 'mp4' | 'webm';
} {
  const candidates: { mimeType: string; extension: 'mp4' | 'webm' }[] = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' }
  ];

  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: 'video/webm', extension: 'webm' };
}

export function startCanvasMediaRecorder(
  compositeCanvas: HTMLCanvasElement,
  audioStream: MediaStream | null,
  fps: number = 60
): {
  stopAndExport: () => Promise<RecordedVideoArtifact>;
} {
  const { mimeType, extension } = probeSupportedVideoMimeType();
  const canvasStream = compositeCanvas.captureStream(fps);

  if (audioStream) {
    audioStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: 8_000_000
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  recorder.start(100);

  const stopAndExport = (): Promise<RecordedVideoArtifact> =>
    new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        resolve({
          url,
          mimeType,
          extension,
          sizeBytes: blob.size
        });
      };
      recorder.stop();
    });

  return { stopAndExport };
}
