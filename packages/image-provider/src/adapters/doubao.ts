import {
  canGenerateImages,
  configFromEnv,
  editImage as doubaoEditImage,
  generateImage as doubaoGenerateImage,
  isDoubaoImageConfigured,
  resolveImageSize,
} from '@acs/doubao-image-provider';
import type { GenerateImageInput, ImageProviderAdapter } from '../types.js';

const DOUBAO_IMAGE_SOURCE = 'doubao-seedream';

function describeDoubaoRequest(
  input: GenerateImageInput,
  operation: 'generate' | 'edit'
) {
  const config = configFromEnv();
  const images = input.image
    ? Array.isArray(input.image)
      ? input.image
      : [input.image]
    : [];
  return {
    endpoint: `${config.baseUrl}/images/generations`,
    body: {
      model: config.model,
      prompt: input.prompt.slice(0, 600),
      size: input.size ?? '2K',
      response_format: 'url',
      output_format: 'png',
      watermark: input.watermark ?? false,
      stream: false,
      sequential_image_generation: 'disabled',
      ...(images.length > 0
        ? {
            image: images.map((url) =>
              url.startsWith('data:') ? `[base64 ${url.length} chars]` : url
            ),
          }
        : {}),
      operation,
    },
  };
}

export const doubaoImageAdapter: ImageProviderAdapter = {
  id: 'doubao',
  label: '豆包 Seedream',
  materialSource: DOUBAO_IMAGE_SOURCE,
  isConfigured: isDoubaoImageConfigured,
  canGenerate: canGenerateImages,
  resolveImageSize,
  generateImage: doubaoGenerateImage,
  editImage: doubaoEditImage,
  describeRequest: describeDoubaoRequest,
};

export { configFromEnv as doubaoConfigFromEnv };
