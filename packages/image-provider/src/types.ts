/** 图片用途：封面 / 正文配图 */
export type ImageRole = 'COVER' | 'BODY';

export type GenerateImageInput = {
  prompt: string;
  size?: string;
  /** 图生图 / 编辑：参考图 URL 或 Base64 */
  image?: string | string[];
  seed?: number;
  watermark?: boolean;
};

export type GenerateImageResult = {
  url: string;
  model: string;
  revisedPrompt?: string;
  mock?: boolean;
};

/**
 * 各厂商图片生成适配器统一接口。
 * 新增厂商：实现此接口 → 在 registry 注册 → 配置 IMAGE_PROVIDER=<id> 即可。
 */
export type ImageProviderAdapter = {
  /** 配置项 IMAGE_PROVIDER 使用的 ID，如 agnes / doubao / openai / dashscope */
  id: string;
  /** 展示名称 */
  label: string;
  /** 写入 material.source 的来源标识 */
  materialSource: string;
  isConfigured: () => boolean;
  canGenerate: () => boolean;
  resolveImageSize: (
    platform?: string,
    role?: ImageRole,
    aspectRatio?: string
  ) => string;
  generateImage: (input: GenerateImageInput) => Promise<GenerateImageResult>;
  editImage: (
    prompt: string,
    sourceImage: string,
    size?: string
  ) => Promise<GenerateImageResult>;
  /** 供日志打印的 HTTP 请求摘要（不含密钥） */
  describeRequest?: (
    input: GenerateImageInput,
    operation: 'generate' | 'edit'
  ) => Record<string, unknown> | undefined;
};
