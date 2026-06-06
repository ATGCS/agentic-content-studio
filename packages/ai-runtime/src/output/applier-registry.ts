import type { OutputApplier } from '../runtime/types.js';
import { outputAppliers } from './appliers.js';

export class OutputApplierRegistry {
  private readonly appliers = new Map<string, OutputApplier>(Object.entries(outputAppliers));

  get(id: string): OutputApplier {
    const applier = this.appliers.get(id);
    if (!applier) throw new Error(`output applier not found: ${id}`);
    return applier;
  }
}

export const outputApplierRegistry = new OutputApplierRegistry();
