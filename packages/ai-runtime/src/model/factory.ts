import type { ModelGateway } from './types.js';
import { DeepSeekGateway } from './providers/deepseek-gateway.js';
import { AgnesGateway } from './providers/agnes-gateway.js';

function hasApiKey(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

export function getModelGateway(): ModelGateway {
  if (hasApiKey('AGNES_API_KEY')) {
    return new AgnesGateway();
  }
  if (hasApiKey('DEEPSEEK_API_KEY')) {
    return new DeepSeekGateway();
  }
  throw new Error('AI 模型未配置：请在 .env 中设置 AGNES_API_KEY');
}
