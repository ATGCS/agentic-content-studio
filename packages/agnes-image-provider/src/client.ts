import { configFromEnv } from './config.js';
import { mockGenerateImage } from './mock.js';
import type { GenerateImageInput, GenerateImageResult } from './types.js';

type AgnesImageResponse = {
  created?: number;
  data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  usage?: { generated_images?: number };
  error?: { message?: string; code?: string };
};

function normalizeImageList(image?: string | string[]) {
  if (!image) return [];
  return (Array.isArray(image) ? image : [image]).filter(Boolean);
}

export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  const config = configFromEnv();
  if (config.useMock) {
    return mockGenerateImage(input);
  }

  const images = normalizeImageList(input.image);
  const isImg2Img = images.length > 0;

  const body: Record<string, unknown> = {
    model: config.model,
    prompt: input.prompt.slice(0, 2000),
    size: input.size ?? '768x1024',
    extra_body: {
      response_format: 'url',
      ...(isImg2Img ? { image: images } : {}),
    },
  };

  if (isImg2Img) {
    body.tags = ['img2img'];
  }
  if (input.seed != null) {
    body.seed = input.seed;
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
  let json: AgnesImageResponse;
  try {
    json = JSON.parse(text) as AgnesImageResponse;
  } catch {
    throw new Error(
      `Agnes 图片 API 返回非 JSON（HTTP ${res.status}）: ${text.slice(0, 200)}`
    );
  }

  if (!res.ok || json.error) {
    throw new Error(
      json.error?.message ??
        `Agnes 图片生成失败 HTTP ${res.status}: ${text.slice(0, 300)}`
    );
  }

  const item = json.data?.[0];
  const url = item?.url;
  if (!url && item?.b64_json) {
    return {
      url: `data:image/png;base64,${item.b64_json}`,
      model: config.model,
      revisedPrompt: item.revised_prompt,
    };
  }
  if (!url) {
    throw new Error('Agnes 图片 API 未返回图片 URL');
  }

  return {
    url,
    model: config.model,
    revisedPrompt: item.revised_prompt,
  };
}

/** 基于已有图片进行修改（图生图 / 编辑） */
export async function editImage(
  prompt: string,
  sourceImage: string,
  size?: string,
  seed?: number
): Promise<GenerateImageResult> {
  return generateImage({
    prompt,
    image: sourceImage,
    size,
    seed,
  });
}
