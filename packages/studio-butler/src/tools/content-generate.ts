import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { buildProposal } from '../confirm-proposal.js';
import type { ButlerAction, ButlerContext, ToolResult } from '../types.js';

export async function contentGenerate(
  ctx: ButlerContext,
  params: { topicId?: string; contentId?: string }
): Promise<ToolResult> {
  const topicId = params.topicId ?? ctx.topicId;

  let candidates: Array<{ id: string; title: string }> = [];

  if (params.contentId) {
    const content = await prisma.content.findUnique({
      where: { id: params.contentId },
      select: { id: true, title: true },
    });
    if (content) candidates = [content];
  } else if (topicId) {
    candidates = await prisma.content.findMany({
      where: {
        topicId,
        status: { in: ['DRAFT', 'PENDING_GENERATE', 'FAILED'] },
      },
      select: { id: true, title: true },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    if (candidates.length === 0) {
      const all = await prisma.content.findMany({
        where: { topicId },
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: 'asc' },
        take: 3,
      });
      if (all.length === 0) {
        return {
          reply: '该系列还没有文章。请先「按大纲创建文章」或手动新建。',
        };
      }
      return {
        reply: `系列内 ${all.length} 篇文章均已有生成记录。最近状态：\n${all.map((c) => `· ${c.title}（${c.status}）`).join('\n')}\n\n可指定文章 ID 单独生成。`,
        actions: all.map((c) => ({
          type: 'create_from_outline',
          label: `重新生成：${c.title}`,
          payload: { contentId: c.id, intent: 'content.generate' },
        })),
      };
    }
  } else {
    return {
      reply:
        '请绑定系列或提供文章 ID。可以说「一键生成」并确保当前会话已关联系列。',
    };
  }

  const topic = topicId
    ? await prisma.topic.findUnique({
        where: { id: topicId },
        select: { title: true },
      })
    : null;

  const contentIds = candidates.map((c) => c.id);
  const proposal = buildProposal('generate_contents', topicId ?? undefined, {
    contentIds,
  });

  const actions: ButlerAction[] = [
    {
      type: 'confirm_proposal',
      label: `确认一键生成 ${candidates.length} 篇`,
      payload: {},
    },
    { type: 'reject_proposal', label: '放弃', payload: {} },
    ...candidates.map((c) => ({
      type: 'view_content' as const,
      label: `预览：${c.title}`,
      href: `/contents/${c.id}`,
    })),
  ];

  const topicLabel = topic?.title ? `系列「${topic.title}」` : '选定内容';
  const list = candidates.map((c) => `· ${c.title}`).join('\n');

  return {
    reply: `将为 ${topicLabel} 执行一键生成（**待确认**，确认后才会开始生成并写入数据库）：\n${list}\n\n生成包含正文、平台改写与配图，耗时可能较长。`,
    actions,
    proposal,
    data: { candidates, topicId, preview: true },
  };
}
