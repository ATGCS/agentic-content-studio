import type { ModelGateway } from './types.js';
import { DeepSeekGateway } from './providers/deepseek-gateway.js';
import { AgnesGateway } from './providers/agnes-gateway.js';

export function getModelGateway(): ModelGateway {
  // Prefer Agnes if configured
  if (process.env.AGNES_API_KEY) {
    return new AgnesGateway();
  }
  // Fall back to DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    return new DeepSeekGateway();
  }
  throw new Error(
    'AI 模型未配置：请在 .env 中设置 AGNES_API_KEY 或 DEEPSEEK_API_KEY'
  );
}
