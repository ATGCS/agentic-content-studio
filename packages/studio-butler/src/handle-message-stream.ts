import { prisma } from '@acs/db';
import type { AuthUser } from '@acs/core';
import { assertSessionOwner } from './sessions.js';
import { routeIntent } from './intent-router.js';
import { executeTool } from './tools/registry.js';
import type { ButlerAction, ButlerStreamEvent, ToolResult } from './types.js';

function emitTextChunks(text: string, pending: string[]) {
  const size = 16;
  for (let i = 0; i < text.length; i += size) {
    pending.push(text.slice(i, i + size));
  }
}

export async function* handleMessageStream(
  user: AuthUser,
  sessionId: string,
  content: string
): AsyncGenerator<ButlerStreamEvent> {
  const session = await assertSessionOwner(user, sessionId);
  const trimmed = content.trim();
  if (!trimmed) {
    yield { type: 'error', message: 'message content is required' };
    return;
  }

  const userMessage = await prisma.butlerMessage.create({
    data: { sessionId, role: 'USER', content: trimmed },
  });

  yield {
    type: 'user_message',
    data: {
      id: userMessage.id,
      content: userMessage.content,
      createdAt: userMessage.createdAt,
    },
  };

  const pending: string[] = [];
  let notify: (() => void) | null = null;
  const waitDelta = () =>
    new Promise<void>((resolve) => {
      notify = resolve;
    });

  const ctx = {
    user,
    sessionId,
    topicId: session.topicId,
    message: trimmed,
    onDelta: (text: string) => {
      pending.push(text);
      notify?.();
      notify = null;
    },
  };

  const routed = routeIntent(ctx);
  let result: ToolResult | null = null;
  let toolError: string | null = null;
  let toolDone = false;

  const toolPromise = executeTool(routed.toolId, ctx, routed.params)
    .then((r) => {
      result = r;
      toolDone = true;
      notify?.();
      notify = null;
    })
    .catch((error) => {
      toolError = error instanceof Error ? error.message : String(error);
      toolDone = true;
      notify?.();
      notify = null;
    });

  let usedLlmStream = false;
  while (!toolDone || pending.length > 0) {
    while (pending.length > 0) {
      usedLlmStream = true;
      yield { type: 'delta', text: pending.shift()! };
    }
    if (toolDone) break;
    await Promise.race([toolPromise, waitDelta()]);
  }

  await toolPromise;

  if (toolError) {
    yield { type: 'error', message: `执行失败：${toolError}` };
    return;
  }

  if (!usedLlmStream && result!.reply) {
    emitTextChunks(result!.reply, pending);
    while (pending.length > 0) {
      yield { type: 'delta', text: pending.shift()! };
    }
  }

  const metadata = {
    toolId: routed.toolId,
    params: routed.params,
    proposal: result!.proposal,
    actions: result!.actions,
    data: result!.data,
  };

  const assistantMessage = await prisma.butlerMessage.create({
    data: {
      sessionId,
      role: 'ASSISTANT',
      content: result!.reply,
      metadata: metadata as object,
    },
  });

  await prisma.butlerSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  yield {
    type: 'done',
    data: {
      assistantMessage: {
        id: assistantMessage.id,
        content: assistantMessage.content,
        metadata: assistantMessage.metadata,
        createdAt: assistantMessage.createdAt,
      },
      actions: result!.actions as ButlerAction[] | undefined,
      data: result!.data,
    },
  };
}
