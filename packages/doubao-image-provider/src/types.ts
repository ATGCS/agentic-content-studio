export type ImageRole = 'COVER' | 'BODY';

export type DoubaoImageConfig = {
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
  watermark?: boolean;
};

export type GenerateImageResult = {
  url: string;
  model: string;
  revisedPrompt?: string;
  mock?: boolean;
};

export const DEFAULT_DOUBAO_BASE_URL =
  'https://ark.cn-beijing.volces.com/api/v3';

/** 方舟模型 ID，需与控制台开通的模型一致 */
export const DEFAULT_DOUBAO_IMAGE_MODEL = 'doubao-seedream-5-0-lite-260128';
