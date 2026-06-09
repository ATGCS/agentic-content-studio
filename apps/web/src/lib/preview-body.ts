export type PreviewMaterial = {
  role?: string;
  url?: string | null;
  name?: string | null;
  meta?: Record<string, unknown> | null;
};

/** 将正文中的 [[IMAGE:id]] 替换为 Markdown 图片（用素材库 BODY 图匹配） */
export function resolveBodyImagePlaceholders(
  body: string,
  materials?: PreviewMaterial[],
  versionId?: string
): string {
  if (!body.includes('[[IMAGE:')) return body;

  return body.replace(/\[\[IMAGE:([^\]]+)\]\]/g, (match, slotId: string) => {
    const material = materials?.find((m) => {
      if (m.role !== 'BODY' || !m.url) return false;
      const meta = m.meta as { slotId?: string; versionId?: string } | null;
      if (meta?.slotId === slotId) {
        return !versionId || !meta.versionId || meta.versionId === versionId;
      }
      return Boolean(m.name?.includes(slotId));
    });

    if (material?.url) {
      const alt =
        (material.name?.replace(/^AI 配图\s*/i, '').trim() || slotId) ?? slotId;
      return `![${alt}](${material.url})`;
    }
    return match;
  });
}

/** 行内 **粗体**、*斜体* */
export function splitInlineFormatting(
  text: string
): Array<{ bold?: boolean; italic?: boolean; text: string }> {
  const parts: Array<{ bold?: boolean; italic?: boolean; text: string }> = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ text: text.slice(last, m.index) });
    }
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push({ bold: true, text: token.slice(2, -2) });
    } else {
      parts.push({ italic: true, text: token.slice(1, -1) });
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length ? parts : [{ text }];
}
