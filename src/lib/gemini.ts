import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { AgentConfig, Flag, Severity } from './types';
import { AGENT_DEFINITIONS, FLAG_TOOL_SCHEMA } from './agents';
import { parseTimestamp } from './video-utils';
import { getStoredApiKey, getStoredModel } from './gemini-config';

let genAI: GoogleGenerativeAI | null = null;
let lastApiKey: string = '';

function getClient(): GoogleGenerativeAI {
  const apiKey = getStoredApiKey();
  if (!apiKey) throw new Error('No Gemini API key configured. Click the ⚙️ icon to add your key.');
  
  if (!genAI || apiKey !== lastApiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    lastApiKey = apiKey;
  }
  return genAI;
}

/**
 * Run a single agent analysis with retry logic
 */
export async function runAgent(
  config: AgentConfig,
  frames: string[],
  videoDuration: number = 0,
  retries: number = 3
): Promise<Flag[]> {
  let lastError: any = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await executeAgentCall(config, frames, videoDuration);
    } catch (e: any) {
      lastError = e;
      const errorMessage = e?.message || String(e);
      const isRateLimit = errorMessage.includes('429') || errorMessage.toLowerCase().includes('too many requests');
      
      console.warn(`Agent call failed (attempt ${i + 1}/${retries + 1})${isRateLimit ? ' [Rate Limit]' : ''}:`, e);
      
      if (i < retries) {
        // Wait before retry (exponential backoff)
        // If it's a rate limit, wait longer
        const baseDelay = isRateLimit ? 3000 : 1000;
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError || new Error('Agent failed after retries');
}

/**
 * Core execution logic for a single agent analysis
 */
async function executeAgentCall(
  config: AgentConfig,
  frames: string[],
  videoDuration: number = 0
): Promise<Flag[]> {
  const client = getClient();
  const agentType = config.type;
  const sensitivity = config.sensitivity;
  
  // Use custom system prompt if available, otherwise fallback to default
  const defaultDef = AGENT_DEFINITIONS[agentType as any];
  const systemPrompt = config.systemPrompt || defaultDef?.systemPrompt || `Analyze video frames for ${config.label} issues.`;
  const toolName = defaultDef?.toolName || `report_${agentType.replace(/\s+/g, '_').toLowerCase()}_flags`;
  const toolDescription = defaultDef?.toolDescription || `Report detected ${config.label} violations in the video frames.`;

  const model = client.getGenerativeModel({
    model: getStoredModel(),
    systemInstruction: systemPrompt + `\n\nSensitivity level: ${sensitivity}/100. Higher sensitivity means flag more subtle issues. The video is approximately ${Math.round(videoDuration)} seconds long. These frames are evenly spaced throughout the video.`,
    tools: [{
      functionDeclarations: [{
        name: toolName,
        description: toolDescription,
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            flags: {
              type: SchemaType.ARRAY,
              description: 'List of detected issues',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  timestamp: { type: SchemaType.STRING, description: 'Timestamp (MM:SS)' },
                  severity: { type: SchemaType.STRING, description: 'critical, warning, or info' },
                  description: { type: SchemaType.STRING, description: 'Issue description' },
                  confidence: { type: SchemaType.NUMBER, description: '0.0-1.0 confidence' },
                },
                required: ['timestamp', 'severity', 'description', 'confidence'],
              },
            },
          },
          required: ['flags'],
        },
      }],
    }],
    toolConfig: {
      functionCallingConfig: {
        mode: 'ANY' as any,
        allowedFunctionNames: [toolName],
      },
    },
  });

  // Build content parts: text + images
  const imageParts = frames.map((frame, i) => {
    const base64Data = frame.split(',')[1];
    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    };
  });

  const result = await model.generateContent([
    `CRITICAL ANALYSIS TASK: Analyze these ${frames.length} sequential video frames for issues. 
    NOTE: This is an AI-generated video and is EXPECTED to have subtle artifacts, hallucinations, or physical inconsistencies. 
    BE HIGHLY CRITICAL. Flag any issues you detect, no matter how subtle.
    Frame numbers correspond to evenly-spaced timestamps across the video duration of ${Math.round(videoDuration)} seconds.`,
    ...imageParts,
  ]);

  const response = result.response;
  
  // Check for blocked content or non-success finish reasons
  if (response.promptFeedback?.blockReason) {
    throw new Error(`Analysis blocked by safety filters: ${response.promptFeedback.blockReason}`);
  }

  const funcCalls = response.functionCalls();

  if (!funcCalls || funcCalls.length === 0) {
    // Safely try to get text or other feedback
    let feedback = 'Agent failed to generate a structured report.';
    try {
      const text = response.text();
      if (text) feedback = `Agent response: ${text.substring(0, 150)}${text.length > 150 ? '...' : ''}`;
    } catch (e) {
      // If text() throws, it might be because there is no text part
      if (response.candidates?.[0]?.finishReason) {
        feedback = `Agent terminated prematurely: ${response.candidates[0].finishReason}`;
      }
    }
    throw new Error(feedback);
  }

  const call = funcCalls[0];
  const args = call.args as any;

  if (!args.flags || !Array.isArray(args.flags)) {
    return [];
  }

  return args.flags.map((f: any, i: number) => ({
    id: `${agentType}-${i}-${Date.now()}`,
    timestamp: f.timestamp || '00:00',
    timestampSeconds: parseTimestamp(f.timestamp || '00:00'),
    severity: (['critical', 'warning', 'info'].includes(f.severity) ? f.severity : 'info') as Severity,
    category: agentType,
    description: f.description || 'Unknown issue',
    confidence: Math.min(1, Math.max(0, Number(f.confidence) || 0.5)),
  }));
}

/**
 * Compute coherence score from flags
 * Higher score = fewer/less severe issues = more coherent video
 */
export function computeCoherenceScore(flags: Flag[]): number {
  if (flags.length === 0) return 100;

  const weights: Record<Severity, number> = {
    critical: 15,
    warning: 7,
    info: 2,
  };

  const totalPenalty = flags.reduce((sum, flag) => {
    return sum + weights[flag.severity] * flag.confidence;
  }, 0);

  return Math.max(0, Math.round(100 - totalPenalty));
}
