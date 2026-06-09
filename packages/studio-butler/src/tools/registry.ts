import type { ButlerContext, ButlerToolId, ToolResult } from '../types.js';
import { topicPlanOutline } from './topic-plan-outline.js';
import { contentCreateFromOutline } from './content-create-from-outline.js';
import { contentGenerate } from './content-generate.js';
import { seriesStatus } from './series-status.js';
import { knowledgeSync } from './knowledge-sync.js';
import { chatReply } from './chat-reply.js';

type ToolHandler = (
  ctx: ButlerContext,
  params: Record<string, unknown>
) => Promise<ToolResult>;

const handlers: Record<ButlerToolId, ToolHandler> = {
  'topic.planOutline': topicPlanOutline,
  'content.createFromOutline': contentCreateFromOutline,
  'content.generate': contentGenerate,
  'series.status': seriesStatus,
  'knowledge.sync': knowledgeSync,
  'chat.reply': chatReply,
};

export async function executeTool(
  toolId: ButlerToolId,
  ctx: ButlerContext,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const handler = handlers[toolId];
  if (!handler) throw new Error(`unknown tool: ${toolId}`);
  return handler(ctx, params);
}
