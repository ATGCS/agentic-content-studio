from pathlib import Path
import json

root = Path('.')

def write(rel, content):
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')
    print('wrote', rel)

write('packages/studio-workflows/src/nodes/content-nodes.ts', r'''import { prisma } from '@acs/db';
import type { WorkflowNodeHandler } from '../engine/types.js';

export const contentSetStatusNode: WorkflowNodeHandler = async (ctx, input) => {
  const status = String(input.status ?? '');
  if (!status) throw new Error('content.setStatus requires status');

  await prisma.content.update({
    where: { id: ctx.contentId },
    data: { status: status as never },
  });

  return { output: { contentStatus: status } };
};
''')

write('packages/studio-workflows/src/nodes/agent-nodes.ts', r'''import { runAgentByType } from '@acs/ai-runtime';
import type { AgentType } from '@acs/db';
import type { WorkflowNodeHandler } from '../engine/types.js';

export const agentRunNode: WorkflowNodeHandler = async (ctx, input) => {
  const agentType = String(input.agentType ?? '') as AgentType;
  if (!agentType) throw new Error('agent.run requires agentType');

  const run = await runAgentByType(agentType, {
    contentId: ctx.contentId,
    versionId: ctx.versionId,
    accountId: ctx.accountId,
    overrides: ctx.platform ? { platform: ctx.platform } : undefined,
  });

  return {
    output: {
      agentType,
      agentRunId: run.id,
      agentStatus: run.status,
    },
  };
};
''')

write('packages/studio-workflows/src/nodes/version-nodes.ts', r'''import { prisma } from '@acs/db';
import type { Platform } from '@acs/db';
import { updateVersionRenderedHtml } from '../platform-body-renderer.js';
import type { WorkflowNodeHandler } from '../engine/types.js';

export const versionEnsureNode: WorkflowNodeHandler = async (ctx) => {
  const platform = ctx.platform;
  if (!platform) throw new Error('version.ensure requires ctx.platform');

  let version = await prisma.contentVersion.findFirst({
    where: { contentId: ctx.contentId, platform },
  });

  if (!version) {
    version = await prisma.contentVersion.create({
      data: {
        contentId: ctx.contentId,
        platform,
        accountId: ctx.accountId,
        status: 'DRAFT',
      },
    });
  }

  const versions = [...ctx.versions.filter((v) => v.id !== version.id), {
    id: version.id,
    platform: version.platform as Platform,
  }];

  return {
    patch: { versionId: version.id, versions },
    output: { versionId: version.id, platform },
  };
};

export const versionRenderHtmlNode: WorkflowNodeHandler = async (ctx) => {
  if (!ctx.versionId) throw new Error('version.renderHtml requires versionId');
  await updateVersionRenderedHtml(ctx.versionId);
  return { output: { renderedVersionId: ctx.versionId } };
};
''')

write('packages/studio-workflows/src/nodes/image-nodes.ts', r'''import { prisma } from '@acs/db';
import { canGenerateImages } from '@acs/image-provider';
import {
  applyBodyImagesToVersion,
  orchestrateBodyImages,
  parseImageSlots,
} from '../body-images.js';
import { orchestrateCoverImages } from '../image-generation.js';
import type { WorkflowNodeHandler } from '../engine/types.js';

export const imageBodySlotsNode: WorkflowNodeHandler = async (ctx) => {
  if (!ctx.versionId || !ctx.platform) {
    throw new Error('image.bodySlots requires versionId and platform');
  }

  const version = await prisma.contentVersion.findUnique({
    where: { id: ctx.versionId },
  });
  const slots = parseImageSlots(version?.formatConfig);

  if (!canGenerateImages() || slots.length === 0) {
    return { output: { hasImageSlots: false, slotCount: 0 } };
  }

  await orchestrateBodyImages(
    ctx.contentId,
    ctx.versionId,
    ctx.platform,
    slots,
    ctx.accountId
  );
  await applyBodyImagesToVersion(ctx.versionId);

  return { output: { hasImageSlots: true, slotCount: slots.length } };
};

export const imageDetectSlotsNode: WorkflowNodeHandler = async (ctx) => {
  if (!ctx.versionId) return { output: { hasImageSlots: false, slotCount: 0 } };

  const version = await prisma.contentVersion.findUnique({
    where: { id: ctx.versionId },
  });
  const slots = parseImageSlots(version?.formatConfig);

  return {
    output: {
      hasImageSlots: slots.length > 0,
      slotCount: slots.length,
    },
    patch: { vars: { hasImageSlots: slots.length > 0 } },
  };
};

export const imageCoversNode: WorkflowNodeHandler = async (ctx) => {
  const materials = await orchestrateCoverImages(
    ctx.contentId,
    ctx.platforms,
    ctx.accountId
  );
  return { output: { coverCount: materials.length } };
};
''')

write('packages/studio-workflows/src/nodes/index.ts', r'''import type { NodeRegistry } from '../engine/registry.js';
import { agentRunNode } from './agent-nodes.js';
import { contentSetStatusNode } from './content-nodes.js';
import {
  imageBodySlotsNode,
  imageCoversNode,
  imageDetectSlotsNode,
} from './image-nodes.js';
import { versionEnsureNode, versionRenderHtmlNode } from './version-nodes.js';

export function registerBuiltinNodes(registry: NodeRegistry): void {
  registry.registerMany({
    'content.setStatus': contentSetStatusNode,
    'agent.run': agentRunNode,
    'version.ensure': versionEnsureNode,
    'version.renderHtml': versionRenderHtmlNode,
    'image.detectSlots': imageDetectSlotsNode,
    'image.bodySlots': imageBodySlotsNode,
    'image.covers': imageCoversNode,
  });
}
''')

definition = {
  "id": "content.generate",
  "name": "内容一键生成",
  "steps": [
    {
      "id": "mark-generating",
      "node": "content.setStatus",
      "input": { "status": "GENERATING" }
    },
    {
      "id": "body-agent",
      "node": "agent.run",
      "input": { "agentType": "BODY" }
    },
    {
      "id": "platform-loop",
      "foreach": "platforms",
      "as": "platform",
      "steps": [
        { "id": "ensure-version", "node": "version.ensure" },
        {
          "id": "rewrite-agent",
          "node": "agent.run",
          "input": { "agentType": "REWRITE" }
        },
        { "id": "detect-slots", "node": "image.detectSlots" },
        {
          "id": "body-images",
          "node": "image.bodySlots",
          "when": "canGenerateImages && hasImageSlots"
        },
        { "id": "render-html", "node": "version.renderHtml" }
      ]
    },
    {
      "id": "cover-images",
      "node": "image.covers",
      "when": "canGenerateImages"
    },
    {
      "id": "mark-review",
      "node": "content.setStatus",
      "input": { "status": "PENDING_REVIEW" }
    }
  ],
  "onError": {
    "node": "content.setStatus",
    "input": { "status": "FAILED" }
  }
}

(root / 'packages/studio-workflows/definitions/content.generate.json').write_text(
    json.dumps(definition, ensure_ascii=False, indent=2) + '\n',
    encoding='utf-8',
)
print('wrote definitions/content.generate.json')

write('packages/studio-workflows/src/content-generation.ts', r'''import type { Platform } from '@acs/db';
import { executeWorkflow } from './engine/executor.js';
import { loadWorkflowDefinition } from './engine/load-definition.js';
import { nodeRegistry } from './engine/registry.js';
import { registerBuiltinNodes } from './nodes/index.js';

let nodesReady = false;

function ensureBuiltinNodes() {
  if (!nodesReady) {
    registerBuiltinNodes(nodeRegistry);
    nodesReady = true;
  }
}

export async function orchestrateGenerate(
  contentId: string,
  accountId?: string,
  platforms: Platform[] = ['XIAOHONGSHU']
) {
  ensureBuiltinNodes();
  const definition = loadWorkflowDefinition('content.generate');
  const result = await executeWorkflow(
    definition,
    { contentId, accountId, platforms },
    nodeRegistry
  );

  return result.context.versions.map((v) => ({ id: v.id, platform: v.platform }));
}
''')

write('packages/studio-workflows/src/index.ts', r'''export { orchestrateGenerate } from './content-generation.js';
export {
  orchestrateImageGeneration,
  orchestrateCoverImages,
  type ImageGenerationOptions,
} from './image-generation.js';
export {
  orchestrateBodyImages,
  applyBodyImagesToVersion,
  parseImageSlots,
  injectImagesIntoBody,
  type ImageSlot,
} from './body-images.js';
export {
  renderWechatHtml,
  renderPlatformBody,
  updateVersionRenderedHtml,
} from './platform-body-renderer.js';

export type {
  WorkflowContext,
  WorkflowDefinition,
  WorkflowNodeHandler,
  WorkflowRunResult,
  WorkflowStep,
} from './engine/types.js';
export { NodeRegistry, nodeRegistry } from './engine/registry.js';
export { executeWorkflow } from './engine/executor.js';
export {
  loadWorkflowDefinition,
  listWorkflowDefinitionIds,
} from './engine/load-definition.js';
export { registerBuiltinNodes } from './nodes/index.js';
''')

print('nodes and content-generation done')
