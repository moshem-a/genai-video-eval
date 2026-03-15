import { GoogleGenerativeAI } from '@google/generative-ai';
import { Flag } from './types';
import { GroundTruthIssue, VideoEntry } from './batch-types';
import { getStoredApiKey, getStoredModel } from './gemini-config';

/**
 * Match ground truth issues to detected flags using timestamp proximity
 * and Gemini semantic similarity.
 */
export async function matchCoverage(
  video: VideoEntry
): Promise<{ coverage: number; matchedGT: GroundTruthIssue[]; unmatchedGT: GroundTruthIssue[] }> {
  const { groundTruth, detectedFlags } = video;

  if (groundTruth.length === 0) {
    return { coverage: 1, matchedGT: [], unmatchedGT: [] };
  }

  if (detectedFlags.length === 0) {
    return {
      coverage: 0,
      matchedGT: [],
      unmatchedGT: groundTruth.map(gt => ({ ...gt, matched: false })),
    };
  }

  // Use Gemini for semantic matching
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    // Fallback to timestamp-only matching
    return timestampOnlyMatch(groundTruth, detectedFlags);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: getStoredModel() });

    const matchPrompt = `You are evaluating whether detected video issues match user-reported ground truth problems.

For each ground truth issue, determine if any detected flag matches it. A match requires:
1. Timestamp proximity: within 3 seconds of each other
2. Semantic similarity: describing the same or very similar issue

Ground Truth Issues:
${groundTruth.map((gt, i) => `[GT-${i}] "${gt.description}" at ${gt.startTime}s${gt.endTime ? `-${gt.endTime}s` : ''}`).join('\n')}

Detected Flags:
${detectedFlags.map((f, i) => `[F-${i}] "${f.description}" at ${f.timestampSeconds}s (${f.severity}, ${f.category})`).join('\n')}

Return a JSON array of objects with: { gtIndex: number, matched: boolean, matchedFlagIndex: number | null, reason: string }
Return ONLY the JSON array, no other text.`;

    const result = await model.generateContent(matchPrompt);
    const text = result.response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return timestampOnlyMatch(groundTruth, detectedFlags);
    }

    const matches = JSON.parse(jsonMatch[0]) as Array<{
      gtIndex: number;
      matched: boolean;
      matchedFlagIndex: number | null;
    }>;

    const matchedGT: GroundTruthIssue[] = [];
    const unmatchedGT: GroundTruthIssue[] = [];

    groundTruth.forEach((gt, i) => {
      const match = matches.find(m => m.gtIndex === i);
      if (match?.matched && match.matchedFlagIndex !== null) {
        matchedGT.push({
          ...gt,
          matched: true,
          matchedFlagId: detectedFlags[match.matchedFlagIndex]?.id,
        });
      } else {
        unmatchedGT.push({ ...gt, matched: false });
      }
    });

    const coverage = matchedGT.length / groundTruth.length;
    return { coverage, matchedGT, unmatchedGT };
  } catch (e) {
    console.error('Gemini matching failed, falling back to timestamp matching:', e);
    return timestampOnlyMatch(groundTruth, detectedFlags);
  }
}

function timestampOnlyMatch(
  groundTruth: GroundTruthIssue[],
  detectedFlags: Flag[]
): { coverage: number; matchedGT: GroundTruthIssue[]; unmatchedGT: GroundTruthIssue[] } {
  const usedFlags = new Set<string>();
  const matchedGT: GroundTruthIssue[] = [];
  const unmatchedGT: GroundTruthIssue[] = [];

  for (const gt of groundTruth) {
    const bestMatch = detectedFlags
      .filter(f => !usedFlags.has(f.id))
      .find(f => Math.abs(f.timestampSeconds - gt.startTime) <= 3);

    if (bestMatch) {
      usedFlags.add(bestMatch.id);
      matchedGT.push({ ...gt, matched: true, matchedFlagId: bestMatch.id });
    } else {
      unmatchedGT.push({ ...gt, matched: false });
    }
  }

  return {
    coverage: groundTruth.length > 0 ? matchedGT.length / groundTruth.length : 1,
    matchedGT,
    unmatchedGT,
  };
}
