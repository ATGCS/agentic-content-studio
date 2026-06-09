import { outputApplierRegistry, setKbAgentTypeResolver } from '@acs/ai-runtime';
import { resolveKbAgentTypes } from './agent-kb-map.js';
import { studioOutputAppliers } from './output-appliers.js';

export function registerStudioAgents(): void {
  outputApplierRegistry.registerMany(studioOutputAppliers);
  setKbAgentTypeResolver(resolveKbAgentTypes);
}
