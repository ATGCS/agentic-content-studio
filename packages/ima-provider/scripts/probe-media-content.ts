import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getImaConfig } from '../src/config.js';
import { imaRequest } from '../src/client.js';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);
const envFile = path.join(repoRoot, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const cfg = await getImaConfig();
const mediaIds = [
  'note_954e14de2d8a83893f694994ac1a50de_74696410896812097469380304643663',
  'markdown_954e14de2d8a83893f694994ac1a50de_e0193f187bb2774a989cd1c13bf692cc7469380304643663',
  'markdown_954e14de2d8a83893f694994ac1a50de_e9ad0bda6825f298e98e1e3d7dd619c37469380304643663',
];

for (const mediaId of mediaIds) {
  console.log('\n=== get_media_info', mediaId.slice(0, 40), '... ===');
  try {
    const info = await imaRequest(cfg, 'openapi/wiki/v1/get_media_info', {
      media_id: mediaId,
    });
    console.log(JSON.stringify(info, null, 2).slice(0, 1500));

    const data = (info as { data?: Record<string, unknown> }).data ?? {};
    const notebookId = (
      data.notebook_ext_info as { notebook_id?: string } | undefined
    )?.notebook_id;
    if (notebookId) {
      console.log('\n--- get_doc_content for note ---');
      const doc = await imaRequest(cfg, 'openapi/note/v1/get_doc_content', {
        doc_id: notebookId,
        target_content_format: 1,
      });
      const content = (doc as { data?: { content?: string } }).data?.content;
      console.log('content preview:', content?.slice(0, 500));
    }

    const url = (data.url_info as { url?: string } | undefined)?.url;
    if (url) {
      console.log('\n--- fetch url ---', url.slice(0, 120));
      const headers = (data.url_info as { headers?: Record<string, string> })
        ?.headers;
      const res = await fetch(url, { headers: headers ?? {} });
      const text = await res.text();
      console.log('status:', res.status, 'preview:', text.slice(0, 500));
    }
  } catch (e) {
    console.log('FAILED:', e instanceof Error ? e.message : e);
  }
}
