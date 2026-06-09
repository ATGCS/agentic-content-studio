import type { ImaConfig } from './types.js';
import { imaRequest } from './client.js';

const DEFAULT_MAX_LENGTH = 800;

function truncate(text: string, maxLength: number): string {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
}

function isMeaningfulNoteContent(content: string | undefined): boolean {
  if (!content) return false;
  const text = content
    .replace(/^#+\s*/gm, '')
    .replace(/\u200b/g, '')
    .trim();
  return text.length >= 8;
}

export async function fetchMediaContent(
  config: ImaConfig,
  mediaId: string,
  maxLength = DEFAULT_MAX_LENGTH
): Promise<string | null> {
  const info = await imaRequest<{
    data?: {
      media_type?: number;
      url_info?: { url?: string; headers?: Record<string, string> };
      notebook_ext_info?: { notebook_id?: string } | null;
    };
  }>(config, 'openapi/wiki/v1/get_media_info', { media_id: mediaId });

  const data = info.data;
  if (!data) return null;

  if (data.media_type === 11 && data.notebook_ext_info?.notebook_id) {
    const doc = await imaRequest<{ data?: { content?: string } }>(
      config,
      'openapi/note/v1/get_doc_content',
      {
        doc_id: data.notebook_ext_info.notebook_id,
        target_content_format: 1,
      }
    );
    const content = doc.data?.content;
    if (!isMeaningfulNoteContent(content)) return null;
    return truncate(content!, maxLength);
  }

  const url = data.url_info?.url;
  if (!url?.startsWith('http')) return null;

  const res = await fetch(url, { headers: data.url_info?.headers ?? {} });
  if (!res.ok) return null;

  const text = (await res.text()).trim();
  if (!text) return null;
  return truncate(text, maxLength);
}

export function itemNeedsContentFetch(item: {
  title: string;
  summary: string;
  mediaId?: string;
}): boolean {
  if (!item.mediaId) return false;
  if (item.summary && item.summary !== item.title) {
    return !item.summary.includes('(知识库条目)');
  }
  return true;
}
