import { outputApplierRegistry, setKbAgentTypeResolver } from '@acs/ai-runtime';
import { resolveKbAgentTypes, studioOutputAppliers } from '@acs/studio-agents';

let ready = false;

/** 在与 runAgent 相同的模块实例上注册 Applier，避免 Next 多 bundle 导致注册丢失 */
export function ensureStudioAgents(): void {
  if (ready) return;
  outputApplierRegistry.registerMany(studioOutputAppliers);
  setKbAgentTypeResolver(resolveKbAgentTypes);
  ready = true;
}
