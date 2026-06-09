import type { NodeRegistry } from '../engine/registry.js';
import { agentRunNode } from './agent-nodes.js';
import { contentSetStatusNode } from './content-nodes.js';
import {
  imageBodySlotsNode,
  imageCoversNode,
  imageDetectSlotsNode,
} from './image-nodes.js';
import { knowledgeSearchNode } from './knowledge-nodes.js';
import { versionEnsureNode, versionRenderHtmlNode } from './version-nodes.js';

export function registerBuiltinNodes(registry: NodeRegistry): void {
  registry.registerMany({
    'content.setStatus': contentSetStatusNode,
    'agent.run': agentRunNode,
    'knowledge.search': knowledgeSearchNode,
    'version.ensure': versionEnsureNode,
    'version.renderHtml': versionRenderHtmlNode,
    'image.detectSlots': imageDetectSlotsNode,
    'image.bodySlots': imageBodySlotsNode,
    'image.covers': imageCoversNode,
  });
}
