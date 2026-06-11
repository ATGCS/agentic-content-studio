/**
 * 将 docs/智能内容运营平台/知识库/ 下的 Markdown 导入 ACS 本地知识库。
 *
 * 用法：pnpm kb:import
 * 可选：pnpm kb:import:dry
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { prisma } from '../packages/db/src/index.ts';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const KB_ROOT = path.join(
  repoRoot,
  'docs/智能内容运营平台/知识库'
);

/** 子目录名后缀 → agentType，如 03-正文-BODY */
const FOLDER_META = {
  '01-选题-TOPIC': { agentType: 'TOPIC', name: 'ACS-选题策划' },
  '02-标题-TITLE': { agentType: 'TITLE', name: 'ACS-标题公式' },
  '03-正文-BODY': { agentType: 'BODY', name: 'ACS-正文写作' },
  '04-封面-COVER': { agentType: 'COVER', name: 'ACS-封面配图' },
  '05-素材-MATERIAL': { agentType: 'MATERIAL', name: 'ACS-素材风格' },
  '06-平台规则-PLATFORM_RULE': {
    agentType: 'PLATFORM_RULE',
    name: 'ACS-平台规则',
  },
  '07-标签-TAG': { agentType: 'TAG', name: 'ACS-标签策略' },
  '08-账号风格-ACCOUNT_STYLE': {
    agentType: 'ACCOUNT_STYLE',
    name: 'ACS-账号风格',
  },
};

const dryRun = process.argv.includes('--dry-run');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw, content: raw };
  }
  const meta = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
    } else {
      val = val.replace(/^['"]|['"]$/g, '');
    }
    meta[key] = val;
  }
  const body = match[2];
  return { meta, body, content: raw };
}

function titleFromMarkdown(body, filename) {
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return path.basename(filename, '.md');
}

function summaryFromContent(content) {
  const plain = content
    .replace(/^---[\s\S]*?---\n?/, '')
    .replace(/[#>*`\[\]()|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 500 ? `${plain.slice(0, 500)}…` : plain;
}

async function ensureKnowledgeBase(meta) {
  const existing = await prisma.imaKnowledgeBase.findFirst({
    where: { name: meta.name },
  });
  if (existing) {
    if (
      existing.agentType !== meta.agentType ||
      existing.source !== 'local'
    ) {
      if (!dryRun) {
        await prisma.imaKnowledgeBase.update({
          where: { id: existing.id },
          data: {
            agentType: meta.agentType,
            enabled: true,
            syncedAt: new Date(),
          },
        });
      }
      console.log(`  ↻ 更新绑定 ${meta.name} → ${meta.agentType}`);
    }
    return existing;
  }

  if (dryRun) {
    console.log(`  + 将创建知识库 ${meta.name} (${meta.agentType})`);
    return { id: 'dry-run', name: meta.name };
  }

  const kb = await prisma.imaKnowledgeBase.create({
    data: {
      externalId: `local-${randomUUID()}`,
      name: meta.name,
      description: `从本地 docs 导入 · ${meta.agentType}`,
      agentType: meta.agentType,
      source: 'local',
      enabled: true,
      syncedAt: new Date(),
    },
  });
  console.log(`  + 创建知识库 ${meta.name}`);
  return kb;
}

async function upsertDocument(kbId, relPath, fileContent) {
  const { meta, body, content } = parseFrontmatter(fileContent);
  if (meta.status === 'deprecated') {
    console.log(`  ⊘ 跳过 deprecated: ${relPath}`);
    return;
  }

  const title = titleFromMarkdown(body, relPath);
  const summary = summaryFromContent(body);
  const externalMediaId = `file:${relPath.replace(/\\/g, '/')}`;

  const existing = await prisma.imaKnowledgeDocument.findFirst({
    where: { knowledgeBaseId: kbId, externalMediaId },
  });

  if (dryRun) {
    console.log(`  · ${existing ? '更新' : '新增'}: ${title}`);
    return;
  }

  if (existing) {
    await prisma.imaKnowledgeDocument.update({
      where: { id: existing.id },
      data: { title, summary, content, syncedAt: new Date() },
    });
    console.log(`  ↻ ${title}`);
  } else {
    await prisma.imaKnowledgeDocument.create({
      data: {
        knowledgeBaseId: kbId,
        externalMediaId,
        title,
        summary,
        content,
        source: 'local',
        syncedAt: new Date(),
      },
    });
    console.log(`  + ${title}`);
  }
}

async function importFolder(folderName, meta) {
  const dir = path.join(KB_ROOT, folderName);
  let stat;
  try {
    stat = await fs.stat(dir);
  } catch {
    return;
  }
  if (!stat.isDirectory()) return;

  console.log(`\n📁 ${folderName}`);
  const kb = await ensureKnowledgeBase(meta);

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .filter((e) => !e.name.startsWith('_'))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  for (const file of files) {
    const full = path.join(dir, file.name);
    const rel = path.join(folderName, file.name);
    const content = await fs.readFile(full, 'utf8');
    await upsertDocument(kb.id, rel, content);
  }
}

async function main() {
  console.log(
    dryRun
      ? '🔍  dry-run 模式（不写数据库）'
      : '📥  导入本地知识库 → ACS'
  );
  console.log(KB_ROOT);

  for (const [folder, meta] of Object.entries(FOLDER_META)) {
    await importFolder(folder, meta);
  }

  console.log('\n✅ 完成');
  if (!dryRun) {
    console.log('请到 设置 → IMA 知识库 确认绑定后测试生成。');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
