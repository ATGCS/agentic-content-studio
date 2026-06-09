import { agnesImageAdapter } from './adapters/agnes.js';
import { doubaoImageAdapter } from './adapters/doubao.js';
import type { ImageProviderAdapter } from './types.js';

/** 内置厂商 ID（新增厂商后在此补充常量，便于引用） */
export const IMAGE_PROVIDER_IDS = {
  AGNES: 'agnes',
  DOUBAO: 'doubao',
  // OPENAI: 'openai',      // 预留：OpenAI DALL·E / GPT Image
  // DASHSCOPE: 'dashscope', // 预留：阿里云通义万相
} as const;

export type KnownImageProviderId =
  (typeof IMAGE_PROVIDER_IDS)[keyof typeof IMAGE_PROVIDER_IDS];

const BUILTIN_ADAPTERS: ImageProviderAdapter[] = [
  agnesImageAdapter,
  doubaoImageAdapter,
];

export class ImageProviderRegistry {
  private readonly adapters = new Map<string, ImageProviderAdapter>();

  constructor(initial: ImageProviderAdapter[] = BUILTIN_ADAPTERS) {
    for (const adapter of initial) {
      this.register(adapter);
    }
  }

  register(adapter: ImageProviderAdapter) {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`图片 Provider "${adapter.id}" 已注册`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): ImageProviderAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new Error(
        `未注册的图片 Provider "${id}"，可用: ${this.listIds().join(', ')}`
      );
    }
    return adapter;
  }

  has(id: string) {
    return this.adapters.has(id);
  }

  list(): ImageProviderAdapter[] {
    return [...this.adapters.values()];
  }

  listIds(): string[] {
    return [...this.adapters.keys()];
  }
}

export const imageProviderRegistry = new ImageProviderRegistry();
