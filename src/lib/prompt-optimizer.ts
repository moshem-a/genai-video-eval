import { GoogleGenerativeAI } from '@google/generative-ai';
import { GroundTruthIssue, PromptSuggestion } from './batch-types';
import { AGENT_DEFINITIONS } from './agents';
import { getStoredApiKey, getStoredModel } from './gemini-config';

/**
 * Given unmatched ground truth issues, use Gemini to suggest agent improvements.
 */
export async function suggestImprovements(
  unmatchedIssues: GroundTruthIssue[]
): Promise<PromptSuggestion[]> {
  if (unmatchedIssues.length === 0) return [];

  const apiKey = getStoredApiKey();
  if (!apiKey) throw new Error('No API key configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: getStoredModel() });

  const agentDescriptions = Object.entries(AGENT_DEFINITIONS)
    .map(([key, def]) => `- ${key}: ${def.systemPrompt.slice(0, 200)}...`)
    .join('\n');

  const prompt = `You are an expert at designing AI video analysis agents. 

Current agents and their prompts:
${agentDescriptions}

The following issues in AI-generated videos were NOT detected by our agents:
${unmatchedIssues.map((issue, i) => `${i + 1}. "${issue.description}" at ${issue.startTime}s${issue.endTime ? `-${issue.endTime}s` : ''}`).join('\n')}

Suggest improvements. For each suggestion, provide:
1. Whether to modify an existing agent's prompt or create a new agent
2. A title for the suggestion
3. A description of what would change
4. The actual prompt text to add or modify

Return a JSON array of objects:
[{
  "type": "modify_existing" | "new_agent",
  "agentType": "object_permanence" | "physics_motion" | "temporal_consistency" | null,
  "title": "string",
  "description": "string", 
  "suggestedPrompt": "string"
}]

Return ONLY the JSON array.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const suggestions = JSON.parse(jsonMatch[0]) as Array<{
    type: 'modify_existing' | 'new_agent';
    agentType?: string;
    title: string;
    description: string;
    suggestedPrompt?: string;
  }>;

  return suggestions.map((s, i) => ({
    id: `suggestion-${Date.now()}-${i}`,
    type: s.type,
    agentType: s.agentType,
    title: s.title,
    description: s.description,
    suggestedPrompt: s.suggestedPrompt,
    accepted: false,
  }));
}
