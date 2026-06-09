import {
  DEFAULT_AGNES_BASE_URL,
  DEFAULT_AGNES_IMAGE_MODEL,
  type AgnesImageConfig,
} from './types.js';

function isPlaceholderApiKey(apiKey: string) {
  if (!apiKey) return true;
  const lowered = apiKey.toLowerCase();
  return (
    lowered.includes('你的') ||
    lowered.includes('placeholder') ||
    lowered.includes('change-me') ||
    lowered.includes('sk-xxx')
  );
}

export function configFromEnv(): AgnesImageConfig {
  const rawKey = process.env.AGNES_API_KEY?.trim() ?? '';
  const apiKey = isPlaceholderApiKey(rawKey) ? '' : rawKey;
  const useMock =
    process.env.USE_MOCK_AGNES_IMAGE === 'true' ||
    (!apiKey && process.env.USE_MOCK_AGNES_IMAGE !== 'false');

  return {
    apiKey,
    baseUrl: process.env.AGNES_BASE_URL?.trim() || DEFAULT_AGNES_BASE_URL,
    model: process.env.AGNES_IMAGE_MODEL?.trim() || DEFAULT_AGNES_IMAGE_MODEL,
    useMock,
  };
}

export function isAgnesImageConfigured(config = configFromEnv()) {
  return Boolean(config.apiKey) && !config.useMock;
}

export function canGenerateImages(config = configFromEnv()) {
  return config.useMock || Boolean(config.apiKey);
}
