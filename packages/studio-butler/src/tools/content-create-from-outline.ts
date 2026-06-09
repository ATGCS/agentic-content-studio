import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import type { TopicOutline } from '@acs/content-center';
import { buildProposal } from '../confirm-proposal.js';
import type { ButlerAction, ButlerContext, ToolResult } from '../types.js';

export async function contentCreateFromOutline(
  ctx: ButlerContext,
  params: { topicId?: string }
): Promise<ToolResult> {
  const topicId = params.topicId ?? ctx.topicId;
  if (!topicId) {
    return {
      reply: '请先绑定系列，或发送「规划大纲」生成系列规划后再创建文章。',
    };
  }

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { contents: { select: { title: true } } },
  });
  if (!topic) throw new AppError(ErrorCodes.NOT_FOUND, 'topic not found', 404);

  const outline = topic.outline as TopicOutline | null;
  if (!outline?.articles?.length) {
    return {
      reply:
        '该系列还没有大纲。请先发送「规划大纲」或「为系列规划 5 篇文章」。',
      actions: [
        {
          type: 'view_topic',
          label: '查看系列',
          href: `/topics/${topicId}`,
        },
      ],
    };
  }

  const existingTitles = new Set(
    topic.contents.map((c) => c.title.trim().toLowerCase())
  );
  const toCreate: Array<{ title: string; summary: string }> = [];
  const skipped: string[] = [];

  const sorted = [...outline.articles].sort((a, b) => a.order - b.order);
  for (const article of sorted) {
    if (existingTitles.has(article.title.trim().toLowerCase())) {
      skipped.push(article.title);
      continue;
    }
    toCreate.push({ title: article.title, summary: article.summary });
  }

  if (toCreate.length === 0) {
    return {
      reply: '大纲中的文章已全部存在，没有可新建的内容。',
      actions: [
        { type: 'view_topic', label: '查看系列', href: `/topics/${topicId}` },
      ],
    };
  }

  const proposal = buildProposal('create_articles', topicId, {
    articles: toCreate,
  });

  let reply = `将按大纲创建 ${toCreate.length} 篇文章（**待确认**，确认后才会写入数据库）：\n${toCreate.map((c) => `· ${c.title}`).join('\n')}`;
  if (skipped.length > 0) {
    reply += `\n\n将跳过已存在：${skipped.join('、')}`;
  }

  const actions: ButlerAction[] = [
    {
      type: 'confirm_proposal',
      label: `确认创建 ${toCreate.length} 篇`,
      payload: {},
    },
    { type: 'reject_proposal', label: '放弃', payload: {} },
    { type: 'view_topic', label: '查看系列', href: `/topics/${topicId}` },
  ];

  return {
    reply,
    actions,
    proposal,
    data: { toCreate, skipped, topicId, preview: true },
  };
}
