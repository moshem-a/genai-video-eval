/**
 * Extract keyframes from a video file as base64 JPEG images.
 * Uses HTML5 Canvas to capture frames at evenly spaced intervals.
 */
export async function extractFrames(
  videoFile: File,
  numFrames: number = 12,
  onProgress?: (progress: number) => void
): Promise<{ frames: string[]; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    
    // Append to DOM to ensure robust frame decoding on all browsers
    video.style.position = 'fixed';
    video.style.top = '-10000px';
    video.style.left = '-10000px';
    video.style.width = '100px'; // Give it dimensions to be safe
    video.style.height = '100px';
    document.body.appendChild(video);

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    const cleanup = () => {
      if (video.parentNode) {
        document.body.removeChild(video);
      }
      URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!duration || duration === Infinity) {
        cleanup();
        reject(new Error('Could not determine video duration'));
        return;
      }

      const canvas = document.createElement('canvas');
      // Cap resolution for performance - increased for better AI detection
      const maxDim = 800;
      const scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight, 1);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d')!;

      const frames: string[] = [];
      const interval = duration / (numFrames + 1);

      for (let i = 1; i <= numFrames; i++) {
        const targetTime = interval * i;
        try {
          await seekTo(video, targetTime);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          frames.push(dataUrl);
          onProgress?.((i / numFrames) * 100);
        } catch (e) {
          console.warn(`Failed to extract frame at ${targetTime}s`, e);
        }
      }

      cleanup();
      resolve({ frames, duration });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video'));
    };
  });
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Seek timeout')), 10000);
    video.onseeked = () => {
      clearTimeout(timeout);
      // Small delay ensures the frame buffer is ready for canvas drawing
      setTimeout(resolve, 50);
    };
    video.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Seek error'));
    };
    video.currentTime = time;
  });
}

/**
 * Convert a File to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Parse timestamp string (MM:SS or HH:MM:SS) to seconds
 */
export function parseTimestamp(ts: string): number {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

/**
 * Format seconds to MM:SS
 */
export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Extract specific frames from a video file at given timestamps.
 */
export async function extractSpecificFrames(
  videoFile: File,
  timestamps: number[],
  onProgress?: (progress: number) => void
): Promise<{ frames: string[]; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    
    video.style.position = 'fixed';
    video.style.top = '-10000px';
    video.style.left = '-10000px';
    video.style.width = '100px';
    video.style.height = '100px';
    document.body.appendChild(video);

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    const cleanup = () => {
      if (video.parentNode) {
        document.body.removeChild(video);
      }
      URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!duration || duration === Infinity) {
        cleanup();
        reject(new Error('Could not determine video duration'));
        return;
      }

      const canvas = document.createElement('canvas');
      const maxDim = 800;
      const scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight, 1);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d')!;

      const frames: string[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const targetTime = Math.min(Math.max(0, timestamps[i]), duration - 0.1);
        try {
          await seekTo(video, targetTime);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          frames.push(dataUrl);
          onProgress?.(((i + 1) / timestamps.length) * 100);
        } catch (e) {
          console.warn(`Failed to extract frame at ${targetTime}s`, e);
        }
      }

      cleanup();
      resolve({ frames, duration });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video'));
    };
  });
}

