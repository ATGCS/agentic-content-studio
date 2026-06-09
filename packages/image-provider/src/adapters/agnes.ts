import {
  canGenerateImages,
  configFromEnv,
  editImage as agnesEditImage,
  generateImage as agnesGenerateImage,
  isAgnesImageConfigured,
  resolveImageSize,
  AGNES_IMAGE_SOURCE,
} from '@acs/agnes-image-provider';
import type { GenerateImageInput, ImageProviderAdapter } from '../types.js';

function describeAgnesRequest(
  input: GenerateImageInput,
  operation: 'generate' | 'edit'
) {
  const config = configFromEnv();
  const images =
    operation === 'edit' && input.image
      ? Array.isArray(input.image)
        ? input.image
        : [input.image]
      : input.image
        ? Array.isArray(input.image)
          ? input.image
          : [input.image]
        : [];
  const isImg2Img = images.length > 0;
  return {
    endpoint: `${config.baseUrl}/images/generations`,
    body: {
      model: config.model,
      prompt: input.prompt.slice(0, 2000),
      size: input.size ?? '768x1024',
      ...(isImg2Img ? { tags: ['img2img'] } : {}),
      ...(input.seed != null ? { seed: input.seed } : {}),
      extra_body: {
        response_format: 'url',
        ...(isImg2Img
          ? {
              image: images.map((url) =>
                url.startsWith('data:') ? `[base64 ${url.length} chars]` : url
              ),
            }
          : {}),
      },
    },
  };
}

export const agnesImageAdapter: ImageProviderAdapter = {
  id: 'agnes',
  label: 'Agnes Image 2.0 Flash',
  materialSource: AGNES_IMAGE_SOURCE,
  isConfigured: isAgnesImageConfigured,
  canGenerate: canGenerateImages,
  resolveImageSize,
  generateImage: agnesGenerateImage,
  editImage: agnesEditImage,
  describeRequest: describeAgnesRequest,
};

export { configFromEnv as agnesConfigFromEnv };
