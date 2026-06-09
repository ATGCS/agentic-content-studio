import type { GenerateImageInput, GenerateImageResult } from './types.js';
import { DEFAULT_AGNES_IMAGE_MODEL } from './types.js';

function hashPrompt(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function mockGenerateImage(
  input: GenerateImageInput
): GenerateImageResult {
  const size = input.size ?? '768x1024';
  const [w, h] = size.includes('x')
    ? size.split('x').map((n) => parseInt(n, 10))
    : [768, 1024];
  const seed = hashPrompt(input.prompt);
  return {
    url: `https://picsum.photos/seed/acs-agnes-${seed}/${w}/${h}`,
    model: `mock-${DEFAULT_AGNES_IMAGE_MODEL}`,
    revisedPrompt: input.prompt,
    mock: true,
  };
}
