import type { GenerateImageInput, GenerateImageResult } from './types.js';

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
  const size = input.size ?? '1536x2048';
  const [w, h] = size.includes('x')
    ? size.split('x').map((n) => parseInt(n, 10))
    : [1536, 2048];
  const seed = hashPrompt(input.prompt);
  return {
    url: `https://picsum.photos/seed/acs-${seed}/${w}/${h}`,
    model: 'mock-doubao-seedream',
    revisedPrompt: input.prompt,
    mock: true,
  };
}
