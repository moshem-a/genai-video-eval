import { useState, useCallback } from 'react';
import { Flag, AgentResult, AnalysisResult } from '@/lib/types';
import { runAgent, computeCoherenceScore } from '@/lib/gemini';
import { DEFAULT_AGENT_CONFIGS } from '@/lib/types';
import { generateVideoWithVeo, VeoModelKey } from '@/lib/veo';
import { extractFrames } from '@/lib/video-utils';

export interface RegenerationResult {
  generatedVideoUrl: string;
  prompt: string;
  reEvaluation: AnalysisResult | null;
  status: 'idle' | 'generating' | 'evaluating' | 'complete' | 'error';
  statusMessage: string;
  error?: string;
}

export function useVideoRegeneration() {
  const [regeneration, setRegeneration] = useState<RegenerationResult>({
    generatedVideoUrl: '',
    prompt: '',
    reEvaluation: null,
    status: 'idle',
    statusMessage: '',
  });

  const regenerate = useCallback(async (
    videoName: string,
    flags: Flag[],
    videoDuration: number,
    veoModel: VeoModelKey = 'veo-3.0',
  ) => {
    setRegeneration({
      generatedVideoUrl: '',
      prompt: '',
      reEvaluation: null,
      status: 'generating',
      statusMessage: 'Preparing regeneration...',
    });

    try {
      // Build correction prompt from detected issues
      const issueDescriptions = flags
        .map(f => `- At ${f.timestamp} (${f.severity}): ${f.description}`)
        .join('\n');

      const prompt = `Regenerate this video "${videoName}" with the following corrections. The original ${Math.round(videoDuration)}s video had these AI-generation artifacts that MUST be avoided:

${issueDescriptions}

Requirements:
- Maintain consistent object permanence throughout all frames
- Ensure physically plausible motion and interactions
- Keep temporal consistency in lighting, colors, and backgrounds
- No flickering, morphing, or teleporting of objects/people
- High quality, artifact-free, photorealistic output
- Cinematic lighting, sharp focus, realistic textures`;

      // Generate video with Veo
      const { videoUrl } = await generateVideoWithVeo({
        prompt,
        model: veoModel,
        durationSeconds: Math.min(Math.round(videoDuration), 8),
        onStatusUpdate: (statusMessage) => {
          setRegeneration(prev => ({ ...prev, statusMessage }));
        },
      });

      setRegeneration(prev => ({
        ...prev,
        generatedVideoUrl: videoUrl,
        prompt,
        status: 'evaluating',
        statusMessage: 'Re-evaluating generated video with agents...',
      }));

      // Re-evaluate the generated video
      const reEvalResult = await reEvaluateVideo(videoUrl, videoName, videoDuration);

      setRegeneration({
        generatedVideoUrl: videoUrl,
        prompt,
        reEvaluation: reEvalResult,
        status: 'complete',
        statusMessage: 'Complete',
      });
    } catch (e) {
      console.error('Regeneration failed:', e);
      setRegeneration(prev => ({
        ...prev,
        status: 'error',
        statusMessage: '',
        error: e instanceof Error ? e.message : 'Regeneration failed',
      }));
    }
  }, []);

  const resetRegeneration = useCallback(() => {
    setRegeneration({
      generatedVideoUrl: '',
      prompt: '',
      reEvaluation: null,
      status: 'idle',
      statusMessage: '',
    });
  }, []);

  return { regeneration, regenerate, resetRegeneration };
}

/**
 * Re-evaluate a generated video using the same multi-agent pipeline.
 * Creates a blob URL video element, extracts frames, then runs agents.
 */
async function reEvaluateVideo(
  videoUrl: string,
  videoName: string,
  originalDuration: number
): Promise<AnalysisResult> {
  // Fetch the video blob and create a File for frame extraction
  const response = await fetch(videoUrl);
  const blob = await response.blob();
  const file = new File([blob], `${videoName}-regenerated.mp4`, { type: 'video/mp4' });

  // Extract frames from the regenerated video
  const { frames, duration } = await extractFrames(file, 10);

  const enabledAgents = DEFAULT_AGENT_CONFIGS.filter(a => a.enabled);

  const agentPromises = enabledAgents.map(async (config): Promise<AgentResult> => {
    try {
      const flags = await runAgent(config.type, frames, config.sensitivity, duration);
      return { agent: config.type, flags, status: 'complete' };
    } catch (e) {
      return {
        agent: config.type,
        flags: [],
        status: 'error',
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  });

  const results = await Promise.all(agentPromises);
  const allFlags = results.flatMap(r => r.flags).sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  const coherenceScore = computeCoherenceScore(allFlags);

  return {
    id: `regen-${Date.now()}`,
    videoName: `${videoName} (Regenerated)`,
    videoUrl,
    videoDuration: duration || originalDuration,
    createdAt: new Date(),
    coherenceScore,
    agents: results,
    flags: allFlags,
  };
}
