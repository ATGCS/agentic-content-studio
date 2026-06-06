import type { ModelGateway } from './types.js';
import { DeepSeekGateway } from './providers/deepseek-gateway.js';
import { MockModelGateway } from './providers/mock-gateway.js';

export function getModelGateway(): ModelGateway {
  if (process.env.USE_MOCK_AI === 'false' && process.env.DEEPSEEK_API_KEY) {
    return new DeepSeekGateway();
  }
  return new MockModelGateway();
}
