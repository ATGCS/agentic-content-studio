import { getImageProvider } from './factory.js';
import { editImageWithLogging, generateImageWithLogging } from './invoke.js';
import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageProviderAdapter,
  ImageRole,
} from './types.js';

export type {
  GenerateImageInput,
  GenerateImageResult,
  ImageProviderAdapter,
  ImageRole,
};

export {
  DEFAULT_IMAGE_PROVIDER,
  getImageProvider,
  listImageProviders,
  resolveImageProviderId,
} from './factory.js';

export {
  IMAGE_PROVIDER_IDS,
  ImageProviderRegistry,
  imageProviderRegistry,
  type KnownImageProviderId,
} from './registry.js';

export { isImageDebugEnabled } from './debug.js';

export { agnesImageAdapter } from './adapters/agnes.js';
export { doubaoImageAdapter } from './adapters/doubao.js';

/** @deprecated 使用 resolveImageProviderId */
export function resolveImageProvider() {
  return getImageProvider().id;
}

export function getImageMaterialSource() {
  return getImageProvider().materialSource;
}

export function getActiveImageProviderLabel() {
  return getImageProvider().label;
}

export function canGenerateImages() {
  return getImageProvider().canGenerate();
}

export function resolveImageSize(
  platform?: string,
  role: ImageRole = 'COVER',
  aspectRatio?: string
) {
  return getImageProvider().resolveImageSize(platform, role, aspectRatio);
}

export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  const provider = getImageProvider();
  return generateImageWithLogging(
    input,
    () => provider.generateImage(input),
    provider.describeRequest?.(input, 'generate')
  );
}

export async function editImage(
  prompt: string,
  sourceImage: string,
  size?: string
): Promise<GenerateImageResult> {
  const provider = getImageProvider();
  const input: GenerateImageInput = { prompt, size, image: sourceImage };
  return editImageWithLogging(
    prompt,
    sourceImage,
    size,
    () => provider.editImage(prompt, sourceImage, size),
    provider.describeRequest?.(input, 'edit')
  );
}

/** 兼容旧引用 */
export { AGNES_IMAGE_SOURCE } from '@acs/agnes-image-provider';
