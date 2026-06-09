import { getTopicStatus } from '@acs/content-center';
import type { ButlerAction, ButlerContext, ToolResult } from '../types.js';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  PENDING_GENERATE: '待生成',
  GENERATING: '生成中',
  PENDING_REVIEW: '待审核',
  REJECTED: '已驳回',
  APPROVED: '已通过',
  PENDING_PUBLISH: '待发布',
  PUBLISHING: '发布中',
  PUBLISHED: '已发布',
  FAILED: '失败',
  REVIEWED: '已审阅',
  ARCHIVED: '已归档',
};

export async function seriesStatus(
  ctx: ButlerContext,
  params: { topicId?: string }
): Promise<ToolResult> {
  const topicId = params.topicId ?? ctx.topicId;
  if (!topicId) {
    return {
      reply: '请先绑定系列，或在系列详情页打开大管家。',
      actions: [{ type: 'view_topic', label: '系列列表', href: '/topics' }],
    };
  }

  const status = await getTopicStatus(topicId);
  const statusLines = Object.entries(status.statusCounts)
    .map(([k, v]) => `· ${STATUS_LABELS[k] ?? k}：${v} 篇`)
    .join('\n');

  const outlineInfo = status.outline
    ? `\n\n**大纲**：已规划 ${status.outline.articles.length} 篇\n${status.outline.summary}`
    : '\n\n**大纲**：尚未规划';

  const articleList =
    status.contents.length > 0
      ? `\n\n**文章列表**：\n${status.contents.map((c, i) => `${i + 1}. ${c.title}（${STATUS_LABELS[c.status] ?? c.status}）`).join('\n')}`
      : '\n\n暂无文章。';

  const actions: ButlerAction[] = [
    { type: 'view_topic', label: '查看系列', href: `/topics/${topicId}` },
  ];
  if (!status.outline) {
    actions.push({
      type: 'create_from_outline',
      label: '规划大纲',
      payload: { topicId, intent: 'topic.planOutline' },
    });
  } else if (status.contentCount < status.outline.articles.length) {
    actions.push({
      type: 'create_from_outline',
      label: '按大纲补建文章',
      payload: { topicId },
    });
  }

  return {
    reply: `**系列「${status.title}」状态**\n文章总数：${status.contentCount} 篇\n${statusLines || '· 暂无文章'}${outlineInfo}${articleList}`,
    actions,
    data: status,
  };
}
