export type ImageRole = 'COVER' | 'BODY';

export type AgnesImageConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  useMock: boolean;
};

export type GenerateImageInput = {
  prompt: string;
  size?: string;
  /** 图生图 / 编辑：参考图 URL 或 Base64 */
  image?: string | string[];
  seed?: number;
};

export type GenerateImageResult = {
  url: string;
  model: string;
  revisedPrompt?: string;
  mock?: boolean;
};

export const DEFAULT_AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1';

/** @see https://agnes-ai.com/doc/agnes-image-20-flash */
export const DEFAULT_AGNES_IMAGE_MODEL = 'agnes-image-2.0-flash';

export const AGNES_IMAGE_SOURCE = 'agnes-image-2.0-flash';
