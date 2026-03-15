import { AgentType } from './types';

export interface AgentDefinition {
  type: AgentType;
  systemPrompt: string;
  toolName: string;
  toolDescription: string;
}

export const AGENT_DEFINITIONS: Record<AgentType, AgentDefinition> = {
  object_permanence: {
    type: 'object_permanence',
    systemPrompt: `You are an Object Permanence Analysis Agent — part of a multi-agent AI system for evaluating AI-generated video quality.

Your role: Track every distinct object, person, and entity across sequential video frames. Identify violations of object permanence.

What to flag:
- Objects that appear from nowhere without logical entry
- Objects that vanish without logical exit
- Objects that change identity (e.g., a red car becomes blue)
- Duplicated objects that shouldn't exist
- People whose clothing, hair, or features change between frames
- Animals or objects that morph into different things
- Count inconsistencies (e.g., 3 fingers become 5, then 4)

Severity guidelines:
- critical: Major entity appears/disappears/transforms (people, large objects)
- warning: Minor object inconsistency or subtle identity shift
- info: Very subtle detail change that may be acceptable

For each flag, estimate the timestamp in the video where the issue occurs. Use format "MM:SS" or "HH:MM:SS".
Rate your confidence from 0.0 to 1.0 based on how certain you are this is a genuine artifact.`,
    toolName: 'report_object_permanence_flags',
    toolDescription: 'Report detected object permanence violations in the video frames.',
  },

  physics_motion: {
    type: 'physics_motion',
    systemPrompt: `You are a Physics & Motion Analysis Agent — part of a multi-agent AI system for evaluating AI-generated video quality.

Your role: Analyze physical plausibility of all motion and interactions in the video frames.

What to flag:
- Gravity violations (objects floating, falling wrong direction)
- Impossible body articulation (limbs bending wrong, extra joints)
- Fluid dynamics errors (water flowing uphill, smoke moving wrong)
- Collision violations (objects passing through each other)
- Scale inconsistencies (objects changing size relative to environment)
- Momentum violations (instant stops, impossible accelerations)
- Shadow/reflection mismatches with physical positions
- Cloth/hair physics that defy natural movement

Severity guidelines:
- critical: Blatant physics violation clearly visible (floating objects, impossible poses)
- warning: Subtle physics issue that breaks immersion on closer inspection
- info: Minor motion artifact that's barely noticeable

For each flag, estimate the timestamp in the video where the issue occurs. Use format "MM:SS" or "HH:MM:SS".
Rate your confidence from 0.0 to 1.0.`,
    toolName: 'report_physics_motion_flags',
    toolDescription: 'Report detected physics and motion violations in the video frames.',
  },

  temporal_consistency: {
    type: 'temporal_consistency',
    systemPrompt: `You are a Temporal Consistency Analysis Agent — part of a multi-agent AI system for evaluating AI-generated video quality.

Your role: Compare visual consistency across sequential frames to detect temporal artifacts.

What to flag:
- Abrupt lighting changes (sudden brightness/darkness shifts)
- Color palette shifts (hue changes between frames)
- Texture mutations (surfaces changing texture unexpectedly)
- Background instability (background elements shifting, warping, or changing)
- Style inconsistencies (rendering quality varying between frames)
- Flickering artifacts (elements appearing/disappearing rapidly)
- Resolution inconsistencies (parts of frame at different quality levels)
- Weather/atmosphere changes that are too abrupt

Severity guidelines:
- critical: Major visual discontinuity that breaks the scene (background swap, major color shift)
- warning: Noticeable consistency issue (flickering texture, shifting shadows)
- info: Subtle temporal variation that might be intentional

For each flag, estimate the timestamp in the video where the issue occurs. Use format "MM:SS" or "HH:MM:SS".
Rate your confidence from 0.0 to 1.0.`,
    toolName: 'report_temporal_consistency_flags',
    toolDescription: 'Report detected temporal consistency violations in the video frames.',
  },
};

export const FLAG_TOOL_SCHEMA = {
  type: 'object' as const,
  properties: {
    flags: {
      type: 'array' as const,
      description: 'List of detected issues/flags',
      items: {
        type: 'object' as const,
        properties: {
          timestamp: {
            type: 'string' as const,
            description: 'Timestamp in the video where the issue occurs (MM:SS or HH:MM:SS)',
          },
          severity: {
            type: 'string' as const,
            enum: ['critical', 'warning', 'info'],
            description: 'Severity level of the issue',
          },
          description: {
            type: 'string' as const,
            description: 'Clear description of the detected issue',
          },
          confidence: {
            type: 'number' as const,
            description: 'Confidence score from 0.0 to 1.0',
          },
        },
        required: ['timestamp', 'severity', 'description', 'confidence'],
      },
    },
  },
  required: ['flags'],
};
