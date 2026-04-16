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
 * Find the best starting frame timestamp that avoids flagged problem regions.
 * Returns null if the entire video is covered by flagged sections.
 */
export function findBestStartFrame(
  flags: Flag[],
  videoDuration: number,
  padding: number = 1
): { timestamp: number | null; confidence: 'clean' | 'none' } {
  if (flags.length === 0) {
    return { timestamp: 0, confidence: 'clean' };
  }

  const sections = flagsToSections(flags, padding);

  // Build clean gaps: time intervals not covered by any flagged section
  const gaps: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const section of sections) {
    if (section.start > cursor) {
      gaps.push({ start: cursor, end: section.start });
    }
    cursor = Math.max(cursor, section.end);
  }
  if (cursor < videoDuration) {
    gaps.push({ start: cursor, end: videoDuration });
  }

  if (gaps.length === 0) {
    return { timestamp: null, confidence: 'none' };
  }

  // Pick the gap closest to t=0, use its midpoint
  const bestGap = gaps[0];
  const timestamp = (bestGap.start + bestGap.end) / 2;

  return { timestamp, confidence: 'clean' };
}

export async function generateRegenerationPrompt(
  videoName: string,
  flags: Flag[],
  videoDuration: number,
  originPrompt?: string,
  hasReferenceImages: boolean = false
): Promise<string> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    // Fallback static prompt
    return buildStaticPrompt(videoName, flags, originPrompt, hasReferenceImages);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelOptions = getStoredModel();
    const model = genAI.getGenerativeModel({ model: modelOptions });

    const prompt = `You are an expert AI Video Producer helping a user fix an AI-generated video that has quality issues.

${originPrompt ? `Original prompt used to generate this video: "${originPrompt}"` : ''}

Video: "${videoName}" (${Math.round(videoDuration)}s duration)

Detected issues by AI Evaluation Agents:
${flags.map(f => `- [${f.category}] At ${f.timestamp} (${f.severity}): ${f.description}`).join('\n')}

Generate a professional, highly detailed prompt for Google Veo 2 or Veo 3 that will fix the issues identified above.

${hasReferenceImages
  ? `CRITICAL — CONTINUITY MODE: The video model will receive a single starting frame extracted from the original video as its visual anchor. The generated video MUST look like it belongs to the same shot as the original.

Your prompt MUST begin with a detailed visual description of the scene (subjects, environment, camera angle, lighting, colors, textures) so the model reproduces the same look. Then instruct the model to:
1. Use the provided starting image as the first frame — the output video must visually match this frame exactly at t=0.
2. Maintain the EXACT camera angle, framing, subject appearance, clothing, scene layout, lighting, and color palette throughout.
3. Preserve visual continuity — the regenerated video should be indistinguishable from the original in terms of look and feel.
4. ONLY fix the specific motion/temporal issues listed below while keeping everything else identical to the source.

Do NOT introduce new visual elements, change the setting, or alter the subject's appearance in any way.`
  : ''}

${originPrompt 
  ? `Analyze the original prompt to understand the user's intent. Identify which specific parts of the prompt might have led to these failures or were too vague. Suggest an improved prompt that:
1. Retains the original concept and creative intent.
2. Incorporates specific technical constraints and descriptions that actively resolve the detected issues (e.g., if object permanence failed, add descriptions emphasize consistency).
3. Explicitly instructs the model to avoid the failed behaviors.`
  : `The original prompt is unavailable. Infer the intended content from the issues and generate a detailed, high-quality prompt that:
1. Clearly describes the scene and action.
2. Includes explicit instructions to avoid the types of errors detected.
3. Specifies technical quality and consistency requirements.`}

Return ONLY the new prompt text, no conversational filler or explanation.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error('Failed to generate regeneration prompt:', e);
    return buildStaticPrompt(videoName, flags, originPrompt, hasReferenceImages);
  }
}

function buildStaticPrompt(videoName: string, flags: Flag[], originPrompt?: string, hasReferenceImages: boolean = false): string {
  const issueDescriptions = flags.map(f => f.description);

  const continuityPrefix = hasReferenceImages
    ? `IMPORTANT: Use the provided starting image as the first frame. The regenerated video must visually match the original — same camera angle, same scene, same subjects, same lighting. Only fix the motion/temporal issues below.\n\n`
    : '';

  return `${continuityPrefix}${originPrompt ? `Based on: "${originPrompt}"\n\n` : ''}Attempting to fix "${videoName}" with these corrections:

AVOID these issues:
${issueDescriptions.map(d => `- ${d}`).join('\n')}

Quality Requirements:
- Consistent object permanence
- Physically plausible motion
- Temporal consistency in lighting and colors
- Artifact-free output`;
}
