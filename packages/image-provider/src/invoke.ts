import { getImageProvider } from './factory.js';
import { logImageError, logImageRequest, logImageResponse } from './debug.js';
import type { GenerateImageInput, GenerateImageResult } from './types.js';

async function withImageLogging(
  operation: 'generate' | 'edit',
  input: GenerateImageInput,
  fn: () => Promise<GenerateImageResult>,
  apiPayload?: Record<string, unknown>
): Promise<GenerateImageResult> {
  const provider = getImageProvider();
  const started = Date.now();
  logImageRequest(provider.id, provider.label, operation, input, apiPayload);
  try {
    const result = await fn();
    logImageResponse(
      provider.id,
      provider.label,
      operation,
      result,
      Date.now() - started
    );
    return result;
  } catch (error) {
    logImageError(
      provider.id,
      provider.label,
      operation,
      error,
      Date.now() - started
    );
    throw error;
  }
}

export async function generateImageWithLogging(
  input: GenerateImageInput,
  fn: () => Promise<GenerateImageResult>,
  apiPayload?: Record<string, unknown>
) {
  return withImageLogging('generate', input, fn, apiPayload);
}

export async function editImageWithLogging(
  prompt: string,
  sourceImage: string,
  size: string | undefined,
  fn: () => Promise<GenerateImageResult>,
  apiPayload?: Record<string, unknown>
) {
  return withImageLogging(
    'edit',
    { prompt, size, image: sourceImage },
    fn,
    apiPayload
  );
}
