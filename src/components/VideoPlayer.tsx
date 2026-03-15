import { useRef, useEffect, useCallback } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
}

export function VideoPlayer({ videoUrl, currentTime, onTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && currentTime !== undefined) {
      const diff = Math.abs(videoRef.current.currentTime - currentTime);
      if (diff > 0.5) {
        videoRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      onTimeUpdate?.(videoRef.current.currentTime);
    }
  }, [onTimeUpdate]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        onTimeUpdate={handleTimeUpdate}
        className="w-full aspect-video bg-background"
      />
    </div>
  );
}
