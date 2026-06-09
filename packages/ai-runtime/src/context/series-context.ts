const MAX_SIBLINGS = 5;
const BODY_EXCERPT_MAX = 400;

export function formatSeriesSiblingExcerpt(
  body: string | null | undefined
): string {
  const text = (body ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  return text.length > BODY_EXCERPT_MAX
    ? `${text.slice(0, BODY_EXCERPT_MAX)}…`
    : text;
}

export function buildSeriesContext(input: {
  topicTitle: string;
  siblings: Array<{
    title: string;
    summary?: string | null;
    body?: string | null;
    createdAt: Date;
  }>;
}): string {
  if (input.siblings.length === 0) return '';

  const lines = [
    `本系列「${input.topicTitle}」已有 ${input.siblings.length} 篇前序内容。撰写时请：`,
    '- 保持叙事主线、术语与人设连贯，可适度承接或递进',
    '- 避免与前文标题、核心论点、案例完全重复',
    '- 若本期是续篇，开头需让读者感知与上篇的衔接',
    '',
  ];

  input.siblings.forEach((item, index) => {
    lines.push(`【前序 ${index + 1}】${item.title}`);
    if (item.summary?.trim()) {
      lines.push(`摘要：${item.summary.trim()}`);
    }
    const excerpt = formatSeriesSiblingExcerpt(item.body);
    if (excerpt) {
      lines.push(`正文摘录：${excerpt}`);
    }
    lines.push('');
  });

  return lines.join('\n').trim();
}

export { MAX_SIBLINGS };
