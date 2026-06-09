import { randomUUID } from 'node:crypto';
import { prisma } from '@acs/db';
import { AppError, ErrorCodes, type AuthUser } from '@acs/core';
import type { TopicOutline } from '@acs/content-center';
import { assertSessionOwner } from './sessions.js';
import type { ButlerAction, ButlerProposal } from './types.js';
import {
  commitCreateArticles,
  commitGenerate,
  commitOutline,
} from './proposals/commit.js';

type MessageMetadata = {
  toolId?: string;
  proposal?: ButlerProposal;
  actions?: ButlerAction[];
  params?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

function parseMetadata(raw: unknown): MessageMetadata {
  if (raw && typeof raw === 'object') return raw as MessageMetadata;
  return {};
}

export async function confirmProposal(
  user: AuthUser,
  sessionId: string,
  messageId: string,
  decision: 'confirm' | 'reject'
) {
  await assertSessionOwner(user, sessionId);

  const message = await prisma.butlerMessage.findUnique({
    where: { id: messageId },
  });
  if (!message || message.sessionId !== sessionId) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'message not found', 404);
  }
  if (message.role !== 'ASSISTANT') {
    throw new AppError(ErrorCodes.BAD_REQUEST, 'invalid message', 400);
  }

  const metadata = parseMetadata(message.metadata);
  const proposal = metadata.proposal;
  if (!proposal || proposal.status !== 'pending') {
    throw new AppError(ErrorCodes.BAD_REQUEST, 'no pending proposal', 400);
  }

  const nextStatus = decision === 'confirm' ? 'confirmed' : 'rejected';
  const updatedProposal: ButlerProposal = { ...proposal, status: nextStatus };

  await prisma.butlerMessage.update({
    where: { id: messageId },
    data: {
      metadata: {
        ...metadata,
        proposal: updatedProposal,
        actions: [],
      } as object,
    },
  });

  if (decision === 'reject') {
    const followUp = await prisma.butlerMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content:
          '已放弃此次建议，不会写入数据库。你可以继续调整指令后重新生成。',
      },
    });
    await prisma.butlerSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
    return {
      decision,
      proposal: updatedProposal,
      followUpMessage: followUp,
    };
  }

  let reply = '';
  let actions: ButlerAction[] = [];
  let data: Record<string, unknown> = {};

  switch (proposal.kind) {
    case 'apply_outline': {
      const topicId = proposal.topicId;
      const outline = proposal.payload.outline as TopicOutline;
      if (!topicId || !outline) throw new Error('invalid outline proposal');
      const result = await commitOutline(user, topicId, outline);
      reply = `已确认并应用大纲到系列「${result.topicTitle}」，共 ${result.articleCount} 篇文章规划。`;
      actions = [
        { type: 'view_topic', label: '查看系列', href: `/topics/${topicId}` },
        {
          type: 'create_from_outline',
          label: '按大纲创建文章',
          payload: { topicId },
        },
      ];
      data = result;
      break;
    }
    case 'create_articles': {
      const topicId = proposal.topicId;
      const articles = proposal.payload.articles as Array<{
        title: string;
        summary: string;
      }>;
      if (!topicId || !articles?.length)
        throw new Error('invalid articles proposal');
      const result = await commitCreateArticles(user, topicId, articles);
      if (result.created.length === 0) {
        reply = '已确认，但大纲中的文章均已存在，没有新建。';
      } else {
        reply = `已确认并创建 ${result.created.length} 篇文章：\n${result.created.map((c) => `· ${c.title}`).join('\n')}`;
      }
      if (result.skipped.length > 0) {
        reply += `\n\n跳过已存在：${result.skipped.join('、')}`;
      }
      actions = result.created.map((c) => ({
        type: 'view_content' as const,
        label: `查看：${c.title}`,
        href: `/contents/${c.id}`,
      }));
      if (result.created.length > 0) {
        actions.unshift({
          type: 'create_from_outline',
          label: '一键生成全部新文章',
          payload: {
            topicId,
            intent: 'content.generate',
            contentIds: result.created.map((c) => c.id),
          },
        });
      }
      data = result;
      break;
    }
    case 'generate_contents': {
      const contentIds = proposal.payload.contentIds as string[];
      const topicId = proposal.topicId;
      if (!contentIds?.length) throw new Error('invalid generate proposal');
      const result = await commitGenerate(topicId, contentIds);
      const ok = result.results.filter((r) => r.ok);
      const fail = result.results.filter((r) => !r.ok);
      if (ok.length > 0) {
        reply = `已确认并完成 ${ok.length} 篇一键生成：\n${ok.map((r) => `· ${r.title}`).join('\n')}`;
      }
      if (fail.length > 0) {
        reply += `\n\n失败 ${fail.length} 篇：\n${fail.map((r) => `· ${r.title}：${r.error}`).join('\n')}`;
      }
      actions = ok.map((r) => ({
        type: 'view_content' as const,
        label: `查看：${r.title}`,
        href: `/contents/${r.id}`,
      }));
      data = result;
      break;
    }
    default:
      throw new Error(`unknown proposal kind: ${proposal.kind}`);
  }

  const followUp = await prisma.butlerMessage.create({
    data: {
      sessionId,
      role: 'ASSISTANT',
      content: reply,
      metadata: { actions, data, sourceProposalId: proposal.id } as object,
    },
  });

  await prisma.butlerSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return {
    decision,
    proposal: updatedProposal,
    followUpMessage: followUp,
    actions,
    data,
  };
}

export function buildProposal(
  kind: ButlerProposal['kind'],
  topicId: string | undefined,
  payload: Record<string, unknown>
): ButlerProposal {
  return {
    id: randomUUID(),
    kind,
    status: 'pending',
    topicId,
    payload,
  };
}
