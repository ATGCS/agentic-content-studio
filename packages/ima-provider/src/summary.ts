import type { KnowledgeItem } from './types.js';

const ITEM_SUMMARY_MAX = 600;

export function formatKnowledgeSummary(items: KnowledgeItem[]): string {
  if (items.length === 0) return '';

  return items
    .map((item, index) => {
      let summary = item.summary;
      if (!summary || summary === item.title) {
        summary = '(无正文摘要)';
      } else if (summary.length > ITEM_SUMMARY_MAX) {
        summary = `${summary.slice(0, ITEM_SUMMARY_MAX)}…`;
      }
      return `[${index + 1}] ${item.title}：${summary}`;
    })
    .join('\n\n');
}
