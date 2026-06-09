import { prisma, type Platform } from '@acs/db';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Markdown 正文 → 公众号风格 HTML */
export function renderWechatHtml(bodyMarkdown: string): string {
  const lines = bodyMarkdown.replace(/\r\n/g, '\n').split('\n');
  const parts: string[] = [];
  let inBlockquote = false;

  const closeBlockquote = () => {
    if (inBlockquote) {
      parts.push('</blockquote>');
      inBlockquote = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeBlockquote();
      continue;
    }

    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      closeBlockquote();
      const alt = escapeHtml(imgMatch[1] || '配图');
      const url = escapeHtml(imgMatch[2]);
      parts.push(
        `<figure style="margin:16px 0;text-align:center"><img src="${url}" alt="${alt}" style="max-width:100%;border-radius:8px" /><figcaption style="margin-top:8px;font-size:13px;color:#86909c">${alt}</figcaption></figure>`
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      closeBlockquote();
      parts.push(
        `<h2 style="margin:20px 0 12px;font-size:18px;font-weight:600;color:#1d2129">${escapeHtml(trimmed.slice(3))}</h2>`
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      closeBlockquote();
      parts.push(
        `<h1 style="margin:24px 0 14px;font-size:20px;font-weight:700;color:#1d2129">${escapeHtml(trimmed.slice(2))}</h1>`
      );
      continue;
    }

    if (trimmed.startsWith('> ')) {
      if (!inBlockquote) {
        parts.push(
          '<blockquote style="margin:12px 0;padding:12px 16px;border-left:4px solid #1664ff;background:#f0f5ff;color:#4e5969">'
        );
        inBlockquote = true;
      }
      parts.push(`<p style="margin:4px 0">${escapeHtml(trimmed.slice(2))}</p>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      closeBlockquote();
      parts.push(
        `<p style="margin:8px 0;padding-left:12px;color:#4e5969">• ${escapeHtml(trimmed.replace(/^[-*]\s+/, ''))}</p>`
      );
      continue;
    }

    closeBlockquote();
    parts.push(
      `<p style="margin:12px 0;line-height:1.8;color:#4e5969;font-size:15px">${escapeHtml(trimmed)}</p>`
    );
  }

  closeBlockquote();
  return parts.join('\n');
}

export function renderPlatformBody(
  platform: Platform | string,
  body: string
): string {
  if (platform === 'WECHAT') {
    return renderWechatHtml(body);
  }
  return body;
}

export async function updateVersionRenderedHtml(versionId: string) {
  const version = await prisma.contentVersion.findUnique({
    where: { id: versionId },
  });
  if (!version?.body) return;

  const renderedHtml = renderPlatformBody(version.platform, version.body);
  const prevConfig =
    version.formatConfig && typeof version.formatConfig === 'object'
      ? (version.formatConfig as Record<string, unknown>)
      : {};

  await prisma.contentVersion.update({
    where: { id: versionId },
    data: {
      formatConfig: {
        ...prevConfig,
        renderedHtml,
        renderedAt: new Date().toISOString(),
      },
    },
  });
}
