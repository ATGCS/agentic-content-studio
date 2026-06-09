import { configFromEnv } from './config.js';
import { mockGenerateImage } from './mock.js';
import type { GenerateImageInput, GenerateImageResult } from './types.js';

type ArkImageResponse = {
  model?: string;
  data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  error?: { message?: string; code?: string };
};

export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  const config = configFromEnv();
  if (config.useMock) {
    return mockGenerateImage(input);
  }

  const body: Record<string, unknown> = {
    model: config.model,
    prompt: input.prompt.slice(0, 600),
    size: input.size ?? '2K',
    response_format: 'url',
    output_format: 'png',
    watermark: input.watermark ?? false,
    stream: false,
    sequential_image_generation: 'disabled',
  };

  if (input.image) {
    body.image = input.image;
  }

  const res = await fetch(`${config.baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: ArkImageResponse;
  try {
    json = JSON.parse(text) as ArkImageResponse;
  } catch {
    throw new Error(
      `豆包图片 API 返回非 JSON（HTTP ${res.status}）: ${text.slice(0, 200)}`
    );
  }

  if (!res.ok || json.error) {
    throw new Error(
      json.error?.message ??
        `豆包图片生成失败 HTTP ${res.status}: ${text.slice(0, 300)}`
    );
  }

  const item = json.data?.[0];
  const url = item?.url;
  if (!url && item?.b64_json) {
    return {
      url: `data:image/png;base64,${item.b64_json}`,
      model: json.model ?? config.model,
      revisedPrompt: item.revised_prompt,
    };
  }
  if (!url) {
    throw new Error('豆包图片 API 未返回图片 URL');
  }

  return {
    url,
    model: json.model ?? config.model,
    revisedPrompt: item.revised_prompt,
  };
}

/** 基于已有图片进行修改（图生图 / 编辑） */
export async function editImage(
  prompt: string,
  sourceImage: string,
  size?: string
): Promise<GenerateImageResult> {
  return generateImage({
    prompt,
    image: sourceImage,
    size,
  });
}
