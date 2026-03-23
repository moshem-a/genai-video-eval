import { useState, useCallback, useRef } from 'react';
import { AnalysisResult, AgentConfig, AgentResult, Flag } from '@/lib/types';
import { extractFrames } from '@/lib/video-utils';
import { runAgent, computeCoherenceScore } from '@/lib/gemini';
import { getStoredAgentConfigs, saveAgentConfigs } from '@/lib/agent-storage';

interface UseVideoAnalysisReturn {
  isAnalyzing: boolean;
  progress: number;
  frameExtractionProgress: number;
  agentResults: AgentResult[];
  result: AnalysisResult | null;
  error: string | null;
  agentConfigs: AgentConfig[];
  setAgentConfigs: (configs: AgentConfig[]) => void;
  analyzeVideo: (file: File, originPrompt?: string) => Promise<void>;
  reset: () => void;
  updateFlag: (flagId: string, update: Partial<Flag>) => void;
}

export function useVideoAnalysis(): UseVideoAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [frameExtractionProgress, setFrameExtractionProgress] = useState(0);
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentConfigs, setAgentConfigsState] = useState<AgentConfig[]>(getStoredAgentConfigs());

  const setAgentConfigs = useCallback((next: AgentConfig[]) => {
    setAgentConfigsState(next);
    saveAgentConfigs(next);
  }, []);

  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setProgress(0);
    setFrameExtractionProgress(0);
    setAgentResults([]);
    setResult(null);
    setError(null);
  }, []);

  const updateFlag = useCallback((flagId: string, update: Partial<Flag>) => {
    setResult(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        flags: prev.flags.map(f => f.id === flagId ? { ...f, ...update } : f),
      };
    });
  }, []);

  const analyzeVideo = useCallback(async (file: File, originPrompt?: string) => {
    setIsAnalyzing(true);
    setError(null);
    setProgress(0);
    setFrameExtractionProgress(0);

    const enabledAgents = agentConfigs.filter(a => a.enabled);
    
    // Initialize agent results
    const initialResults: AgentResult[] = enabledAgents.map(a => ({
      agent: a.type,
      flags: [],
      status: 'pending',
    }));
    setAgentResults(initialResults);

    try {
      // Step 1: Extract frames or image
      setProgress(10);
      let frames: string[] = [];
      let duration = 0;

      if (file.type.startsWith('image/')) {
        const { fileToBase64 } = await import('@/lib/video-utils');
        const base64 = await fileToBase64(file);
        frames = [base64];
        setFrameExtractionProgress(100);
        setProgress(30);
      } else {
        const result = await extractFrames(file, 12, (p) => {
          setFrameExtractionProgress(p);
          setProgress(10 + (p / 100) * 20);
        });
        frames = result.frames;
        duration = result.duration;
      }

      if (frames.length === 0) {
        throw new Error('No frames could be extracted from the video');
      }

      // Step 2: Run agents in parallel (NOW PROXIED VIA ADK BACKEND)
      setProgress(30);
      const videoUrl = URL.createObjectURL(file);

      // We send one request to the ADK backend which orchestrates the agents
      setAgentResults(prev => prev.map(r => ({ ...r, status: 'running' as const })));
      
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_base64: frames[0], // Sending the first frame or the image
            mime_type: file.type,
            text: originPrompt || "Analyze this media for critical reality-check violations."
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Backend analysis failed');
        }

        const data = await response.json();
        // The backend returns a structured response from the ADK Agent
        // We need to parse this into our local State structure
        
        let parsedFlags: Flag[] = [];
        try {
          // Expecting format: {"response": "{\"flags\": [...]}"} or similar structured text
          const rawResponse = data.response;
          const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
             const parsed = JSON.parse(jsonMatch[0]);
             if (parsed.flags) {
               parsedFlags = parsed.flags.map((f: any, idx: number) => ({
                 id: `flag-${Date.now()}-${idx}`,
                 timestampSeconds: 0,
                 severity: f.severity || 'critical',
                 description: f.description,
                 category: 'visual_artifact',
                 confidence: f.confidence || 0.9,
                 confirmed: false,
                 dismissed: false
               }));
             }
          }
        } catch (e) {
          console.error("Failed to parse ADK response:", e);
          throw new Error("Invalid response format from ADK Agent");
        }

        const coherenceScore = computeCoherenceScore(parsedFlags);
        
        // Map back to agent results (since we used a unified agent engine)
        const results: AgentResult[] = enabledAgents.map(a => ({
          agent: a.type,
          flags: parsedFlags.filter(f => f.category === a.type || a.type === 'auditor'),
          status: 'complete'
        }));

        setAgentResults(results);
        setProgress(100);
        setResult({
          id: Date.now().toString(),
          videoName: file.name,
          videoUrl,
          videoDuration: duration,
          createdAt: new Date(),
          coherenceScore,
          agents: results,
          flags: parsedFlags,
          originPrompt,
        });
      } catch (e) {
        throw e;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [agentConfigs]);

  return {
    isAnalyzing,
    progress,
    frameExtractionProgress,
    agentResults,
    result,
    error,
    agentConfigs,
    setAgentConfigs,
    analyzeVideo,
    reset,
    updateFlag,
  };
}
