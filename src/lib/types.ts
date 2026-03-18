export type Severity = 'critical' | 'warning' | 'info';

export type DefaultAgentType = 'object_permanence' | 'physics_motion' | 'temporal_consistency';
export type AgentType = DefaultAgentType | string;

export interface Flag {
  id: string;
  timestamp: string;
  timestampSeconds: number;
  severity: Severity;
  category: AgentType;
  description: string;
  confidence: number;
  confirmed?: boolean;
  dismissed?: boolean;
}

export interface AgentResult {
  agent: AgentType;
  flags: Flag[];
  status: 'pending' | 'running' | 'complete' | 'error';
  error?: string;
}

export interface AnalysisResult {
  id: string;
  videoName: string;
  videoUrl: string;
  videoDuration: number;
  createdAt: Date;
  coherenceScore: number;
  agents: AgentResult[];
  flags: Flag[];
  originPrompt?: string; // Add this
}

export interface AgentConfig {
  id: string;
  type: AgentType;
  enabled: boolean;
  sensitivity: number; // 0-100
  label: string;
  description: string;
  icon: string;
  color: string;
  systemPrompt?: string;
}

export const DEFAULT_AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'agent-object-permanence',
    type: 'object_permanence',
    enabled: true,
    sensitivity: 70,
    label: 'Object Permanence',
    description: 'Tracks identities and existence of objects across frames',
    icon: 'Eye',
    color: 'hsl(var(--primary))',
  },
  {
    id: 'agent-physics-motion',
    type: 'physics_motion',
    enabled: true,
    sensitivity: 70,
    label: 'Physics & Motion',
    description: 'Validates gravity, fluid dynamics, and articulation',
    icon: 'Zap',
    color: 'hsl(var(--warning))',
  },
  {
    id: 'agent-temporal-consistency',
    type: 'temporal_consistency',
    enabled: true,
    sensitivity: 70,
    label: 'Temporal Consistency',
    description: 'Monitors lighting, color shifts, and background stability',
    icon: 'Clock',
    color: 'hsl(var(--success))',
  },
];
