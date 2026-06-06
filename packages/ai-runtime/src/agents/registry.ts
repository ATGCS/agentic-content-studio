import type { AgentType } from '@acs/db';
import type { AgentSpec } from '../runtime/types.js';
import { defaultAgentSpecs } from './specs.js';

export class AgentSpecRegistry {
  private readonly specs = new Map<AgentType, AgentSpec>();

  constructor(specs: AgentSpec[] = defaultAgentSpecs) {
    for (const spec of specs) {
      this.specs.set(spec.type, spec);
    }
  }

  get(type: AgentType): AgentSpec {
    const spec = this.specs.get(type);
    if (!spec) throw new Error(`agent spec not found for type ${type}`);
    return spec;
  }

  list(): AgentSpec[] {
    return Array.from(this.specs.values());
  }
}

export const agentSpecRegistry = new AgentSpecRegistry();
