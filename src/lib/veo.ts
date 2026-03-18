import { getStoredApiKey } from './gemini-config';

const BASE_URL = '/google-api/v1beta';

// Available Veo models
export const VEO_MODELS = {
  'veo-3.0': 'veo-3.0-generate-001',
  'veo-3.1': 'veo-3.1-generate-preview',
  'veo-2.0': 'veo-2.0-generate-001',
} as const;

export type VeoModelKey = keyof typeof VEO_MODELS;

interface VeoGenerateOptions {
  prompt: string;
  model?: VeoModelKey;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  durationSeconds?: number;
  includeAudio?: boolean;
  referenceImages?: string[]; // Array of base64 strings
  onStatusUpdate?: (status: string) => void;
}

interface VeoGenerateResult {
  videoUrl: string;
  videoBlob: Blob;
}

/**
 * Generate a video using Google's Veo API (long-running operation).
 * Requires a Gemini API key with billing enabled.
 */
export async function generateVideoWithVeo(options: VeoGenerateOptions): Promise<VeoGenerateResult> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('No Gemini API key configured. Click the ⚙️ icon to add your key.');
  }

  const {
    prompt,
    model = 'veo-3.0',
    aspectRatio = '16:9',
    durationSeconds = 5,
    includeAudio = true,
    referenceImages,
    onStatusUpdate,
  } = options;

  onStatusUpdate?.('Submitting video generation request...');

  // Step 1: Submit the generation request
  const instance: any = {
    prompt,
  };

  // Add reference images as visual style control if provided
  if (referenceImages && referenceImages.length > 0) {
    // For Veo 3.x, visual consistency is often handled via a style reference
    // We'll use the first reference image for maximum impact
    // For Vertex AI, we must use camelCase for referenceImages and referenceType
    // NOTE: referenceImages is only supported by Veo 3.1 (preview) on current Vertex AI.
    // Including it for 3.0 or 2.0 causes a 400 error.
    if (model === 'veo-3.1' && referenceImages && referenceImages.length > 0) {
      const base64Data = referenceImages[0].includes(',') ? referenceImages[0].split(',')[1] : referenceImages[0];
      
      instance.referenceImages = [
        {
          image: {
            bytesBase64Encoded: base64Data,
          },
          referenceType: "STYLE"
        }
      ];
    }
  }

  const payload = {
    instances: [instance],
    parameters: {
      aspectRatio,
      durationSeconds,
      ...(includeAudio === true ? { includeAudio: true } : {}),
    },
  };

  const modelId = VEO_MODELS[model];
  const generateResponse = await fetch(
    `${BASE_URL}/models/${modelId}:predictLongRunning`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!generateResponse.ok) {
    const errorBody = await generateResponse.text();
    console.error('Veo generation error:', generateResponse.status, errorBody);

    if (generateResponse.status === 403) {
      throw new Error('Veo API access denied. Make sure your Gemini API key has billing enabled and Veo access.');
    }
    if (generateResponse.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    throw new Error(`Veo API error (${generateResponse.status}): ${errorBody.slice(0, 200)}`);
  }

  const operationData = await generateResponse.json();
  const operationName = operationData.name;

  if (!operationName) {
    throw new Error('No operation name returned from Veo API');
  }

  onStatusUpdate?.('Video generation started. This may take 2-5 minutes...');

  // Step 2: Poll for completion
  const videoUri = await pollOperation(apiKey, operationName, onStatusUpdate);

  onStatusUpdate?.('Downloading generated video...');

  // Step 3: Download the video
  const videoBlob = await downloadVideo(apiKey, videoUri);
  const videoUrl = URL.createObjectURL(videoBlob);

  return { videoUrl, videoBlob };
}

/**
 * Poll the operation endpoint until the video is ready.
 */
async function pollOperation(
  apiKey: string,
  operationName: string,
  onStatusUpdate?: (status: string) => void,
  maxAttempts: number = 120, // 10 minutes max (5s intervals)
  intervalMs: number = 5000,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(intervalMs);

    const elapsed = Math.round((attempt + 1) * intervalMs / 1000);
    onStatusUpdate?.(`Generating video... (${elapsed}s elapsed)`);

    const pollResponse = await fetch(
      `${BASE_URL}/${operationName}`,
      {
        headers: {
          'x-goog-api-key': apiKey,
        },
      }
    );

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      console.warn(`Poll attempt ${attempt + 1} failed:`, pollResponse.status, errorText);
      // Continue polling on transient errors
      if (pollResponse.status >= 500) continue;
      throw new Error(`Polling error (${pollResponse.status}): ${errorText.slice(0, 200)}`);
    }

    const pollData = await pollResponse.json();
    console.log('Veo poll response:', JSON.stringify(pollData).slice(0, 500));

    if (pollData.done) {
      if (pollData.error) {
        throw new Error(`Video generation failed: ${pollData.error.message || JSON.stringify(pollData.error)}`);
      }

      // Extract video URI from response - checking multiple possible structures
      const response = pollData.response || {};
      const generatedVideos = response.generateVideoResponse?.generatedSamples 
        || response.generatedVideos 
        || response.generatedSamples 
        || response.videos 
        || response.output?.generatedVideos 
        || (Array.isArray(response) ? response : []);

      if (!generatedVideos || (Array.isArray(generatedVideos) && generatedVideos.length === 0)) {
        console.error('No video found in Veo success response:', JSON.stringify(pollData));
        throw new Error('Video generation completed but no video was returned. Please try a different prompt or model.');
      }

      const firstVideo = Array.isArray(generatedVideos) ? generatedVideos[0] : generatedVideos;
      const videoUri = firstVideo?.video?.uri || firstVideo?.uri;
      
      if (!videoUri) {
        console.error('Video URI missing in Veo success response:', JSON.stringify(pollData));
        throw new Error('Video URI not found in the completion response.');
      }

      return videoUri;
    }
  }

  throw new Error('Video generation timed out. Please try again.');
}

/**
 * Download the generated video using the API key for auth.
 */
async function downloadVideo(apiKey: string, videoUri: string): Promise<Blob> {
  // The video URI may be a full URL or a relative path
  let url = videoUri.startsWith('http')
    ? videoUri.replace('https://generativelanguage.googleapis.com', '/google-api')
    : `${BASE_URL}/${videoUri}`;

  // Add API key as a query parameter
  url = `${url}${url.includes('?') ? '&' : '?'}key=${apiKey}`;

  const response = await fetch(url, {
    headers: {
      'x-goog-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }

  return response.blob();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
