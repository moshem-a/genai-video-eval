import { GoogleGenerativeAI } from '@google/generative-ai';
import { Flag } from './types';
import { RemediationSection } from './batch-types';
import { getStoredApiKey, getStoredModel } from './gemini-config';

/**
 * Determine the recommended remediation strategy based on problem density.
 */
export function recommendStrategy(
  flags: Flag[],
  videoDuration: number
): 'cut' | 'regenerate' {
  if (videoDuration === 0) return 'regenerate';

  // Merge overlapping problem sections
  const sections = flagsToSections(flags);
  const totalProblemDuration = sections.reduce((sum, s) => sum + (s.end - s.start), 0);
  const problemRatio = totalProblemDuration / videoDuration;

  // If more than 30% of video has problems, regenerate
  return problemRatio > 0.3 ? 'regenerate' : 'cut';
}

/**
 * Convert flags into merged time sections (with 1s padding).
 */
export function flagsToSections(flags: Flag[], padding: number = 1): RemediationSection[] {
  if (flags.length === 0) return [];

  const sorted = [...flags].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  const sections: RemediationSection[] = [];

  let current: RemediationSection = {
    start: Math.max(0, sorted[0].timestampSeconds - padding),
    end: sorted[0].timestampSeconds + padding,
  };

  for (let i = 1; i < sorted.length; i++) {
    const flagStart = Math.max(0, sorted[i].timestampSeconds - padding);
    const flagEnd = sorted[i].timestampSeconds + padding;

    if (flagStart <= current.end) {
      // Merge overlapping
      current.end = Math.max(current.end, flagEnd);
    } else {
      sections.push(current);
      current = { start: flagStart, end: flagEnd };
    }
  }
  sections.push(current);

  return sections;
}

/**
 * Generate a Veo 2/3 prompt to regenerate the video without the detected issues.
 */
export async function generateRegenerationPrompt(
  videoName: string,
  flags: Flag[],
  videoDuration: number
): Promise<string> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    // Fallback static prompt
    return buildStaticPrompt(videoName, flags);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: getStoredModel() });

    const prompt = `You are helping a user fix an AI-generated video that has quality issues.

Video: "${videoName}" (${Math.round(videoDuration)}s duration)

Detected issues:
${flags.map(f => `- At ${f.timestamp} (${f.severity}): ${f.description}`).join('\n')}

Generate a detailed prompt that the user can use with Veo 2 or Veo 3 to regenerate this video WITHOUT the above issues. The prompt should:
1. Describe the intended video content (infer from the issues what the video likely depicts)
2. Explicitly instruct to avoid each type of detected issue
3. Include technical quality requirements
4. Be formatted as a ready-to-use generation prompt

Return ONLY the prompt text, no explanation.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error('Failed to generate regeneration prompt:', e);
    return buildStaticPrompt(videoName, flags);
  }
}

function buildStaticPrompt(videoName: string, flags: Flag[]): string {
  const issueTypes = [...new Set(flags.map(f => f.category))];
  const issueDescriptions = flags.map(f => f.description);

  return `Regenerate the video "${videoName}" with the following corrections:

AVOID these issues:
${issueDescriptions.map(d => `- ${d}`).join('\n')}

Requirements:
- Maintain consistent object permanence throughout all frames
- Ensure physically plausible motion and interactions
- Keep temporal consistency in lighting, colors, and backgrounds
- High quality, artifact-free output`;
}
