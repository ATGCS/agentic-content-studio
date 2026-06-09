export function buildOutlinePrompt(input: {
  topicTitle: string;
  topicDescription?: string | null;
  userRequest: string;
  knowledgeSummary?: string;
  existingArticles?: Array<{ title: string; summary?: string | null }>;
  articleCount?: number;
}) {
  const existing =
    input.existingArticles && input.existingArticles.length > 0
      ? `\n已有文章（避免重复）：\n${input.existingArticles
          .map(
            (a, i) =>
              `${i + 1}. ${a.title}${a.summary ? ` — ${a.summary}` : ''}`
          )
          .join('\n')}`
      : '';

  const knowledge = input.knowledgeSummary?.trim()
    ? `\n参考知识库：\n${input.knowledgeSummary}`
    : '';

  const count = input.articleCount ?? 5;

  return `你是内容运营策划专家。请为以下系列规划文章大纲。

系列标题：${input.topicTitle}
系列描述：${input.topicDescription ?? '（无）'}
用户需求：${input.userRequest}
建议篇数：${count} 篇${existing}${knowledge}

请输出严格 JSON（不要 markdown 代码块），格式：
{
  "summary": "系列整体策划说明（2-3句）",
  "targetPlatforms": ["XIAOHONGSHU"],
  "articles": [
    {
      "order": 1,
      "title": "文章标题",
      "summary": "200字以内摘要",
      "keyPoints": ["要点1", "要点2"]
    }
  ]
}`;
}
