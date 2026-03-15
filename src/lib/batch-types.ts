import { Flag, AgentConfig, AgentResult } from './types';

export interface GroundTruthIssue {
  id: string;
  description: string;
  startTime: number; // seconds
  endTime?: number;  // seconds
  matched?: boolean;
  matchedFlagId?: string;
}

export interface RemediationSection {
  start: number;
  end: number;
}

export interface Remediation {
  strategy: 'cut' | 'regenerate';
  sections: RemediationSection[];
  generatedPrompt?: string;
  status: 'pending' | 'processing' | 'done';
  resultVideoUrl?: string;
}

export interface VideoEntry {
  id: string;
  file: File;
  name: string;
  videoUrl: string;
  duration: number;
  groundTruth: GroundTruthIssue[];
  detectedFlags: Flag[];
  agentResults: AgentResult[];
  coverage: number;
  unmatchedIssues: GroundTruthIssue[];
  status: 'pending' | 'extracting' | 'analyzing' | 'matching' | 'complete' | 'error';
  error?: string;
  remediation?: Remediation;
  passed: boolean;
}

export interface BatchEvaluation {
  id: string;
  name: string;
  createdAt: Date;
  coverageThreshold: number; // 0-1
  status: 'uploading' | 'evaluating' | 'complete';
  videos: VideoEntry[];
  overallCoverage: number;
}

export interface PromptSuggestion {
  id: string;
  type: 'modify_existing' | 'new_agent';
  agentType?: string;
  title: string;
  description: string;
  suggestedPrompt?: string;
  accepted: boolean;
}

export function createVideoEntry(file: File): VideoEntry {
  return {
    id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    name: file.name,
    videoUrl: URL.createObjectURL(file),
    duration: 0,
    groundTruth: [],
    detectedFlags: [],
    agentResults: [],
    coverage: 0,
    unmatchedIssues: [],
    status: 'pending',
    passed: false,
  };
}

export function createGroundTruthIssue(description: string, startTime: number, endTime?: number): GroundTruthIssue {
  return {
    id: `gt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description,
    startTime,
    endTime,
  };
}
