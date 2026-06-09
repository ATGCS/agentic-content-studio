import { z } from 'zod';
import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import type { TopicOutline } from '@acs/content-center';
import { extractJson, resolveChatModel, streamChat } from '@acs/ai-runtime';
import { searchLocalKnowledge } from '@acs/ima-provider';
import { resolveKbAgentTypes } from '@acs/studio-agents';
import { buildOutlinePrompt } from '../prompts/outline.js';
import { buildProposal } from '../confirm-proposal.js';
import type { ButlerAction, ButlerContext, ToolResult } from '../types.js';

const outlineSchema = z.object({
  summary: z.string(),
  targetPlatforms: z.array(z.string()).optional(),
  articles: z.array(
    z.object({
      order: z.number(),
      title: z.string(),
      summary: z.string(),
      keyPoints: z.array(z.string()).optional(),
    })
  ),
});

export async function topicPlanOutline(
  ctx: ButlerContext,
  params: { topicId?: string; articleCount?: number }
): Promise<ToolResult> {
  const topicId = params.topicId ?? ctx.topicId;
  if (!topicId) {
    return {
      reply:
        '请先绑定一个系列（在系列详情页点击「用大管家规划」），或告诉我系列 ID，我才能规划大纲。',
      actions: [{ type: 'view_topic', label: '前往系列管理', href: '/topics' }],
    };
  }

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      contents: {
        select: { title: true, summary: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!topic) throw new AppError(ErrorCodes.NOT_FOUND, 'topic not found', 404);

  const knowledge = await searchLocalKnowledge({
    query: `${topic.title} ${topic.description ?? ''} ${ctx.message}`,
    kbAgentTypes: resolveKbAgentTypes('TOPIC'),
    limit: 5,
  });

  const prompt = buildOutlinePrompt({
    topicTitle: topic.title,
    topicDescription: topic.description,
    userRequest: ctx.message,
    knowledgeSummary: knowledge.summary,
    existingArticles: topic.contents,
    articleCount: params.articleCount,
  });

  const model = resolveChatModel('deepseek-chat');
  const raw = await streamChat({
    model,
    messages: [
      {
        role: 'system',
        content:
          '你是内容运营策划助手，只输出合法 JSON，不要附加解释或 markdown 代码块。',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    onDelta: ctx.onDelta,
  });

  const parsed = outlineSchema.parse(extractJson(raw));
  const outline: TopicOutline = {
    ...parsed,
    plannedAt: new Date().toISOString(),
  };

  const articleList = outline.articles
    .sort((a, b) => a.order - b.order)
    .map((a) => `${a.order}. **${a.title}** — ${a.summary}`)
    .join('\n');

  const proposal = buildProposal('apply_outline', topicId, { outline });

  const actions: ButlerAction[] = [
    { type: 'confirm_proposal', label: '确认应用大纲', payload: {} },
    { type: 'reject_proposal', label: '放弃', payload: {} },
    { type: 'view_topic', label: '查看系列', href: `/topics/${topicId}` },
  ];

  return {
    reply: `已为系列「${topic.title}」生成 ${outline.articles.length} 篇文章大纲（**待确认**，确认后才会写入数据库）。\n\n**策划说明**：${outline.summary}\n\n**文章列表**：\n${articleList}`,
    actions,
    proposal,
    data: { outline, topicId, preview: true },
  };
}
