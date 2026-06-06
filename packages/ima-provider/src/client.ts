import { AppError, ErrorCodes } from '@acs/core';
import type { ImaConfig } from './types.js';

export async function imaRequest<T = unknown>(
  config: ImaConfig,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ima-openapi-clientid': config.clientId,
      'ima-openapi-apikey': config.apiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new AppError(
      ErrorCodes.INTERNAL,
      `IMA invalid JSON response: ${text.slice(0, 200)}`,
      502
    );
  }

  const root = json as Record<string, unknown>;
  const code = root.code ?? root.err_code ?? root.errCode;
  if (code !== undefined && code !== 0 && code !== '0') {
    throw new AppError(
      ErrorCodes.INTERNAL,
      String(root.message ?? root.msg ?? `IMA error code ${code}`),
      502
    );
  }

  if (!res.ok) {
    throw new AppError(
      ErrorCodes.INTERNAL,
      `IMA HTTP ${res.status}: ${text.slice(0, 200)}`,
      502
    );
  }

  return json as T;
}
