import { useState, useCallback } from 'react';
import {
  BatchEvaluation,
  VideoEntry,
  GroundTruthIssue,
  createVideoEntry,
  createGroundTruthIssue,
} from '@/lib/batch-types';
import { AgentConfig, DEFAULT_AGENT_CONFIGS, Flag } from '@/lib/types';
import { extractFrames } from '@/lib/video-utils';
import { runAgent, computeCoherenceScore } from '@/lib/gemini';
import { matchCoverage } from '@/lib/coverage';

const BATCH_STORAGE_KEY = 'aegis_batch_evaluations';

function saveBatchToStorage(batch: BatchEvaluation) {
  try {
    // We can't serialize File objects, so we store metadata only
    const serializable = {
      ...batch,
      videos: batch.videos.map(v => ({
        ...v,
        file: undefined, // Can't serialize File
        videoUrl: '', // Will be regenerated
      })),
    };
    localStorage.setItem(`${BATCH_STORAGE_KEY}_${batch.id}`, JSON.stringify(serializable));
  } catch {
    // Storage full or other error, continue without persistence
  }
}

export function useBatchEvaluation() {
  const [batch, setBatch] = useState<BatchEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(-1);
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>(DEFAULT_AGENT_CONFIGS);

  const createBatch = useCallback((name: string, coverageThreshold: number = 0.85) => {
    const newBatch: BatchEvaluation = {
      id: `batch-${Date.now()}`,
      name,
      createdAt: new Date(),
      coverageThreshold,
      status: 'uploading',
      videos: [],
      overallCoverage: 0,
    };
    setBatch(newBatch);
    return newBatch;
  }, []);

  const addVideos = useCallback((files: File[]) => {
    setBatch(prev => {
      if (!prev) return prev;
      const newEntries = files.map(f => createVideoEntry(f));
      return { ...prev, videos: [...prev.videos, ...newEntries] };
    });
  }, []);

  const removeVideo = useCallback((videoId: string) => {
    setBatch(prev => {
      if (!prev) return prev;
      const video = prev.videos.find(v => v.id === videoId);
      if (video) URL.revokeObjectURL(video.videoUrl);
      return { ...prev, videos: prev.videos.filter(v => v.id !== videoId) };
    });
  }, []);

  const addGroundTruth = useCallback((videoId: string, description: string, startTime: number, endTime?: number) => {
    setBatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        videos: prev.videos.map(v =>
          v.id === videoId
            ? { ...v, groundTruth: [...v.groundTruth, createGroundTruthIssue(description, startTime, endTime)] }
            : v
        ),
      };
    });
  }, []);

  const removeGroundTruth = useCallback((videoId: string, issueId: string) => {
    setBatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        videos: prev.videos.map(v =>
          v.id === videoId
            ? { ...v, groundTruth: v.groundTruth.filter(gt => gt.id !== issueId) }
            : v
        ),
      };
    });
  }, []);

  const updateThreshold = useCallback((threshold: number) => {
    setBatch(prev => prev ? { ...prev, coverageThreshold: threshold } : prev);
  }, []);

  const evaluateVideo = useCallback(async (video: VideoEntry): Promise<VideoEntry> => {
    const enabledAgents = agentConfigs.filter(a => a.enabled);

    // Step 1: Extract frames
    const updateStatus = (status: VideoEntry['status']) => {
      setBatch(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          videos: prev.videos.map(v => v.id === video.id ? { ...v, status } : v),
        };
      });
    };

    updateStatus('extracting');
    const { frames, duration } = await extractFrames(video.file, 10);
    video = { ...video, duration };

    if (frames.length === 0) {
      return { ...video, status: 'error', error: 'No frames extracted' };
    }

    // Step 2: Run agents
    updateStatus('analyzing');
    const agentResults = await Promise.all(
      enabledAgents.map(async (config) => {
        try {
          const flags = await runAgent(config.type, frames, config.sensitivity, duration);
          return { agent: config.type, flags, status: 'complete' as const };
        } catch (e) {
          return {
            agent: config.type,
            flags: [] as Flag[],
            status: 'error' as const,
            error: e instanceof Error ? e.message : 'Unknown error',
          };
        }
      })
    );

    const allFlags = agentResults.flatMap(r => r.flags).sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    video = { ...video, detectedFlags: allFlags, agentResults };

    // Step 3: Match coverage
    updateStatus('matching');
    const { coverage, matchedGT, unmatchedGT } = await matchCoverage(video);

    return {
      ...video,
      coverage,
      groundTruth: [
        ...matchedGT,
        ...unmatchedGT,
      ],
      unmatchedIssues: unmatchedGT,
      status: 'complete',
      passed: false,
    };
  }, [agentConfigs]);

  const runBatchEvaluation = useCallback(async () => {
    if (!batch || batch.videos.length === 0) return;

    setIsEvaluating(true);
    setBatch(prev => prev ? { ...prev, status: 'evaluating' } : prev);

    const updatedVideos: VideoEntry[] = [];

    for (let i = 0; i < batch.videos.length; i++) {
      setCurrentVideoIndex(i);
      try {
        const result = await evaluateVideo(batch.videos[i]);
        updatedVideos.push(result);
      } catch (e) {
        updatedVideos.push({
          ...batch.videos[i],
          status: 'error',
          error: e instanceof Error ? e.message : 'Evaluation failed',
        });
      }

      // Update batch with each completed video
      setBatch(prev => {
        if (!prev) return prev;
        const videos = [...prev.videos];
        videos[i] = updatedVideos[i];
        return { ...prev, videos };
      });
    }

    // Calculate overall coverage
    const completedVideos = updatedVideos.filter(v => v.status === 'complete' && v.groundTruth.length > 0);
    const overallCoverage = completedVideos.length > 0
      ? completedVideos.reduce((sum, v) => sum + v.coverage, 0) / completedVideos.length
      : 1;

    setBatch(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        videos: updatedVideos,
        status: 'complete' as const,
        overallCoverage,
      };
      saveBatchToStorage(updated);
      return updated;
    });

    setIsEvaluating(false);
    setCurrentVideoIndex(-1);
  }, [batch, evaluateVideo]);

  const reset = useCallback(() => {
    if (batch) {
      batch.videos.forEach(v => URL.revokeObjectURL(v.videoUrl));
    }
    setBatch(null);
    setIsEvaluating(false);
    setCurrentVideoIndex(-1);
  }, [batch]);

  return {
    batch,
    isEvaluating,
    currentVideoIndex,
    agentConfigs,
    setAgentConfigs,
    createBatch,
    addVideos,
    removeVideo,
    addGroundTruth,
    removeGroundTruth,
    updateThreshold,
    runBatchEvaluation,
    reset,
    setBatch,
  };
}
