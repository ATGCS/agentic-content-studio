import type { ButlerContext, ButlerToolId, RoutedIntent } from './types.js';

const CUID_RE = /\b[c][a-z0-9]{20,30}\b/i;

function extractId(text: string): string | undefined {
  const match = text.match(CUID_RE);
  return match?.[0];
}

function extractArticleCount(text: string): number | undefined {
  const match = text.match(/(\d+)\s*篇/);
  if (match) return Math.min(20, Math.max(1, parseInt(match[1], 10)));
  const numMatch = text.match(/\b(\d+)\b/);
  if (numMatch) return Math.min(20, Math.max(1, parseInt(numMatch[1], 10)));
  return undefined;
}

export function routeIntent(ctx: ButlerContext): RoutedIntent {
  const text = ctx.message.trim();
  const lower = text.toLowerCase();
  const topicId = ctx.topicId ?? extractId(text);
  const contentId = extractId(text);

  if (/规划|大纲|系列计划|策划|排期/.test(text)) {
    return {
      toolId: 'topic.planOutline',
      params: { topicId, articleCount: extractArticleCount(text) },
    };
  }

  if (/按大纲|从大纲|大纲建|创建文章|新建文章|批量建/.test(text)) {
    return { toolId: 'content.createFromOutline', params: { topicId } };
  }

  if (/一键生成|生成内容|出稿|开始生成/.test(text)) {
    return { toolId: 'content.generate', params: { topicId, contentId } };
  }

  if (/系列状态|进度|完成情况|系列概况|查看系列/.test(text)) {
    return { toolId: 'series.status', params: { topicId } };
  }

  if (/同步知识|知识库同步|同步知识库|更新知识/.test(text)) {
    return { toolId: 'knowledge.sync', params: {} };
  }

  if (
    lower.includes('hello') ||
    lower.includes('你好') ||
    lower.includes('帮助')
  ) {
    return { toolId: 'chat.reply', params: { hint: true } };
  }

  return { toolId: 'chat.reply', params: { topicId } };
}

export function listAvailableTools(): ButlerToolId[] {
  return [
    'topic.planOutline',
    'content.createFromOutline',
    'content.generate',
    'series.status',
    'knowledge.sync',
    'chat.reply',
  ];
}
