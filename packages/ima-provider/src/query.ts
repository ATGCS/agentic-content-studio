export function buildImaSearchQuery(input: {
  title?: string | null;
  summary?: string | null;
  topicTitle?: string | null;
  topicDesc?: string | null;
  platform?: string | null;
}): string {
  const seen = new Set<string>();
  const parts: string[] = [];

  for (const value of [
    input.topicTitle,
    input.title,
    input.summary,
    input.topicDesc,
    input.platform,
  ]) {
    const text = value?.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    parts.push(text);
  }

  return parts.join(' ').slice(0, 300) || '内容运营';
}
