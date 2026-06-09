export function isImageDebugEnabled(): boolean {
  if (process.env.DEBUG_IMAGE === 'false') return false;
  if (process.env.DEBUG_IMAGE === 'true') return true;
  return process.env.NODE_ENV === 'development';
}

function logSection(title: string) {
  console.log(`\n========== [ImageAPI] ${title} ==========`);
}

function truncate(value: string, max = 500) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…(${value.length} 字)`;
}

function summarizeImageInput(input: {
  prompt: string;
  size?: string;
  image?: string | string[];
  seed?: number;
  watermark?: boolean;
}) {
  const images = input.image
    ? Array.isArray(input.image)
      ? input.image
      : [input.image]
    : [];
  return {
    prompt: truncate(input.prompt, 800),
    size: input.size,
    mode: images.length > 0 ? 'img2img' : 'text2img',
    referenceImages: images.map((url) =>
      url.startsWith('data:') ? `[base64 ${url.length} chars]` : url
    ),
    seed: input.seed,
    watermark: input.watermark,
  };
}

function summarizeImageOutput(output: {
  url: string;
  model: string;
  revisedPrompt?: string;
  mock?: boolean;
}) {
  return {
    model: output.model,
    mock: output.mock ?? false,
    url: output.url.startsWith('data:')
      ? `[base64 ${output.url.length} chars]`
      : output.url,
    revisedPrompt: output.revisedPrompt
      ? truncate(output.revisedPrompt, 300)
      : undefined,
  };
}

export function logImageRequest(
  providerId: string,
  providerLabel: string,
  operation: 'generate' | 'edit',
  input: Parameters<typeof summarizeImageInput>[0],
  apiPayload?: Record<string, unknown>
) {
  if (!isImageDebugEnabled()) return;
  logSection(`${providerLabel} (${providerId}) · ${operation} · 入参`);
  console.log(JSON.stringify(summarizeImageInput(input), null, 2));
  if (apiPayload) {
    logSection('HTTP 请求体');
    console.log(JSON.stringify(apiPayload, null, 2));
  }
}

export function logImageResponse(
  providerId: string,
  providerLabel: string,
  operation: 'generate' | 'edit',
  output: Parameters<typeof summarizeImageOutput>[0],
  durationMs: number,
  rawResponse?: unknown
) {
  if (!isImageDebugEnabled()) return;
  logSection(
    `${providerLabel} (${providerId}) · ${operation} · 出参 (${durationMs}ms)`
  );
  console.log(JSON.stringify(summarizeImageOutput(output), null, 2));
  if (rawResponse !== undefined) {
    logSection('HTTP 原始响应');
    console.log(
      typeof rawResponse === 'string'
        ? truncate(rawResponse, 2000)
        : JSON.stringify(rawResponse, null, 2)
    );
  }
}

export function logImageError(
  providerId: string,
  providerLabel: string,
  operation: 'generate' | 'edit',
  error: unknown,
  durationMs: number
) {
  if (!isImageDebugEnabled()) return;
  logSection(
    `${providerLabel} (${providerId}) · ${operation} · 失败 (${durationMs}ms)`
  );
  console.error(error instanceof Error ? error.message : String(error));
}
