import {
  DEFAULT_DOUBAO_BASE_URL,
  DEFAULT_DOUBAO_IMAGE_MODEL,
  type DoubaoImageConfig,
} from './types.js';

function isPlaceholderApiKey(apiKey: string) {
  if (!apiKey) return true;
  const lowered = apiKey.toLowerCase();
  return (
    lowered.includes('你的') ||
    lowered.includes('placeholder') ||
    lowered.includes('change-me') ||
    lowered.includes('sk-xxx') ||
    apiKey === '你的火山方舟 API Key'
  );
}

export function configFromEnv(): DoubaoImageConfig {
  const rawKey =
    process.env.DOUBAO_API_KEY?.trim() ?? process.env.ARK_API_KEY?.trim() ?? '';
  const apiKey = isPlaceholderApiKey(rawKey) ? '' : rawKey;
  const useMock =
    process.env.USE_MOCK_DOUBAO_IMAGE === 'true' ||
    (!apiKey && process.env.USE_MOCK_DOUBAO_IMAGE !== 'false');

  return {
    apiKey,
    baseUrl: process.env.DOUBAO_BASE_URL?.trim() || DEFAULT_DOUBAO_BASE_URL,
    model: process.env.DOUBAO_IMAGE_MODEL?.trim() || DEFAULT_DOUBAO_IMAGE_MODEL,
    useMock,
  };
}

export function isDoubaoImageConfigured(config = configFromEnv()) {
  return Boolean(config.apiKey) && !config.useMock;
}

export function canGenerateImages(config = configFromEnv()) {
  return config.useMock || Boolean(config.apiKey);
}
