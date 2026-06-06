import { prisma } from '@acs/db';
import {
  DEFAULT_IMA_BASE_URL,
  IMA_CONFIG_KEY,
  type ImaConfig,
} from './types.js';

export function configFromEnv(): Partial<ImaConfig> {
  const clientId =
    process.env.IMA_OPENAPI_CLIENTID ?? process.env.IMA_CLIENT_ID ?? '';
  const apiKey =
    process.env.IMA_OPENAPI_APIKEY ??
    process.env.IMA_API_KEY ??
    process.env.IMA_APIKEY ??
    '';
  const useMock = process.env.USE_MOCK_IMA !== 'false';
  return {
    clientId,
    apiKey,
    baseUrl: process.env.IMA_BASE_URL ?? DEFAULT_IMA_BASE_URL,
    useMock: useMock || !clientId || !apiKey,
  };
}

export async function getImaConfig(): Promise<ImaConfig> {
  const row = await prisma.systemConfig.findUnique({
    where: { key: IMA_CONFIG_KEY },
  });
  const stored = (row?.value ?? {}) as Partial<ImaConfig>;
  const env = configFromEnv();

  const clientId = stored.clientId ?? env.clientId ?? '';
  const apiKey = stored.apiKey ?? env.apiKey ?? '';
  const baseUrl = stored.baseUrl ?? env.baseUrl ?? DEFAULT_IMA_BASE_URL;
  const useMock =
    stored.useMock ?? env.useMock ?? (!clientId || !apiKey);

  return { clientId, apiKey, baseUrl, useMock };
}

export async function saveImaConfig(
  input: Partial<ImaConfig>
): Promise<ImaConfig> {
  const current = await getImaConfig();
  const next: ImaConfig = {
    clientId: input.clientId ?? current.clientId,
    apiKey: input.apiKey?.trim() ? input.apiKey : current.apiKey,
    baseUrl: input.baseUrl?.trim() || current.baseUrl || DEFAULT_IMA_BASE_URL,
    useMock: input.useMock ?? current.useMock,
  };

  await prisma.systemConfig.upsert({
    where: { key: IMA_CONFIG_KEY },
    update: {
      value: next as object,
      description: 'IMA OpenAPI credentials and mode',
    },
    create: {
      key: IMA_CONFIG_KEY,
      value: next as object,
      description: 'IMA OpenAPI credentials and mode',
    },
  });

  return next;
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey) return '';
  if (apiKey.length <= 4) return '****';
  return `${'*'.repeat(Math.min(8, apiKey.length - 4))}${apiKey.slice(-4)}`;
}

export function publicImaConfig(config: ImaConfig) {
  return {
    clientId: config.clientId,
    apiKey: maskApiKey(config.apiKey),
    hasApiKey: Boolean(config.apiKey),
    baseUrl: config.baseUrl,
    useMock: config.useMock,
    configured: Boolean(config.clientId && config.apiKey),
  };
}
