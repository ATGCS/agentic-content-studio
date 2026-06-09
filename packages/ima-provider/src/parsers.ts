export function extractKnowledgeBases(data: unknown): Array<{
  externalId: string;
  name: string;
  description?: string;
  raw: unknown;
}> {
  const root = data as Record<string, unknown>;
  const payload = (root.data ?? root) as Record<string, unknown>;
  const list =
    (payload.knowledge_base_list as unknown[]) ??
    (payload.knowledgeBaseList as unknown[]) ??
    (payload.info_list as unknown[]) ??
    (payload.list as unknown[]) ??
    (Array.isArray(payload) ? payload : []);

  return list
    .map((item) => {
      const row = item as Record<string, unknown>;
      const externalId = String(
        row.knowledge_base_id ??
          row.kb_id ??
          row.knowledgeBaseId ??
          row.id ??
          ''
      );
      if (!externalId) return null;
      return {
        externalId,
        name: String(row.kb_name ?? row.name ?? row.title ?? '未命名知识库'),
        description:
          typeof row.description === 'string' ? row.description : undefined,
        raw: item,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export function extractSearchItems(
  data: unknown,
  limit: number
): Array<{
  title: string;
  summary: string;
  url?: string;
  source?: string;
}> {
  const root = data as Record<string, unknown>;
  const payload = (root.data ?? root) as Record<string, unknown>;
  const list =
    (payload.knowledge_list as unknown[]) ??
    (payload.knowledgeList as unknown[]) ??
    (payload.info_list as unknown[]) ??
    (payload.items as unknown[]) ??
    (payload.list as unknown[]) ??
    [];

  return list.slice(0, limit).map((item, index) => {
    const row = item as Record<string, unknown>;
    const title = String(
      row.title ??
        row.name ??
        row.file_name ??
        row.fileName ??
        `结果 ${index + 1}`
    );
    const summary = String(
      row.highlight_content ??
        row.summary ??
        row.abstract ??
        row.snippet ??
        row.content ??
        row.description ??
        title
    );
    const url =
      typeof row.url === 'string'
        ? row.url
        : typeof row.link === 'string'
          ? row.link
          : undefined;
    return {
      title,
      summary: summary.slice(0, 500),
      url,
      source: 'ima',
    };
  });
}
