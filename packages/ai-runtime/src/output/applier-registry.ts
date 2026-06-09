import type { OutputApplier } from '../runtime/types.js';

const REGISTRY_KEY = Symbol.for('@acs/outputApplierRegistry');

const noopApplier: OutputApplier = async () => {};

export class OutputApplierRegistry {
  private readonly appliers = new Map<string, OutputApplier>([
    ['noop', noopApplier],
  ]);

  register(id: string, applier: OutputApplier): void {
    this.appliers.set(id, applier);
  }

  registerMany(record: Record<string, OutputApplier>): void {
    for (const [id, applier] of Object.entries(record)) {
      this.register(id, applier);
    }
  }

  get(id: string): OutputApplier {
    const applier = this.appliers.get(id);
    if (!applier) throw new Error(`output applier not found: ${id}`);
    return applier;
  }
}

function getSharedRegistry(): OutputApplierRegistry {
  const globalStore = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: OutputApplierRegistry;
  };
  if (!globalStore[REGISTRY_KEY]) {
    globalStore[REGISTRY_KEY] = new OutputApplierRegistry();
  }
  return globalStore[REGISTRY_KEY];
}

export const outputApplierRegistry = getSharedRegistry();
