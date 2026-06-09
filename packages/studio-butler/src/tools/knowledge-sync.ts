import { syncAllFromIma } from '@acs/ima-provider';
import type { ButlerContext, ToolResult } from '../types.js';

export async function knowledgeSync(
  _ctx: ButlerContext,
  _params: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const result = await syncAllFromIma({ all: true });
    const docCount = Array.isArray(result.documents)
      ? result.documents.reduce((sum, item) => sum + (item.count ?? 0), 0)
      : 0;
    return {
      reply: `知识库同步完成。\n· 知识库：${result.knowledgeBases} 个\n· 文档：${docCount} 条`,
      actions: [
        { type: 'view_topic', label: '查看知识库', href: '/knowledge' },
      ],
      data: result,
    };
  } catch (error) {
    return {
      reply: `知识库同步失败：${error instanceof Error ? error.message : String(error)}。请检查 IMA 配置（系统设置 → IMA）。`,
      actions: [
        { type: 'view_topic', label: 'IMA 配置', href: '/settings/ima' },
      ],
    };
  }
}
