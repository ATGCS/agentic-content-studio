import { prisma } from '@acs/db';
import type { AuthUser } from '@acs/core';
import { assertSessionOwner } from './sessions.js';
import { routeIntent } from './intent-router.js';
import { executeTool } from './tools/registry.js';
import type { ButlerAction, ToolResult } from './types.js';

export type HandleMessageResult = {
  userMessage: { id: string; content: string; createdAt: Date };
  assistantMessage: {
    id: string;
    content: string;
    metadata?: unknown;
    createdAt: Date;
  };
  actions?: ButlerAction[];
  data?: Record<string, unknown>;
};

export async function handleMessage(
  user: AuthUser,
  sessionId: string,
  content: string
): Promise<HandleMessageResult> {
  const session = await assertSessionOwner(user, sessionId);
  const trimmed = content.trim();
  if (!trimmed) throw new Error('message content is required');

  const userMessage = await prisma.butlerMessage.create({
    data: { sessionId, role: 'USER', content: trimmed },
  });

  const ctx = {
    user,
    sessionId,
    topicId: session.topicId,
    message: trimmed,
  };

  const routed = routeIntent(ctx);
  let result: ToolResult;

  try {
    result = await executeTool(routed.toolId, ctx, routed.params);
  } catch (error) {
    result = {
      reply: `执行失败：${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const metadata = {
    toolId: routed.toolId,
    params: routed.params,
    proposal: result.proposal,
    actions: result.actions,
    data: result.data,
  };

  const assistantMessage = await prisma.butlerMessage.create({
    data: {
      sessionId,
      role: 'ASSISTANT',
      content: result.reply,
      metadata: metadata as object,
    },
  });

  await prisma.butlerSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return {
    userMessage: {
      id: userMessage.id,
      content: userMessage.content,
      createdAt: userMessage.createdAt,
    },
    assistantMessage: {
      id: assistantMessage.id,
      content: assistantMessage.content,
      metadata: assistantMessage.metadata,
      createdAt: assistantMessage.createdAt,
    },
    actions: result.actions,
    data: result.data,
  };
}
