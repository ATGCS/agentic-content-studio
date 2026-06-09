import { resolveChatModel, streamChat } from '@acs/ai-runtime';
import type { ButlerContext, ToolResult } from '../types.js';
import { listAvailableTools } from '../intent-router.js';

const HELP_TEXT = `我是内容运营中台的「大管家」，可以帮你：

· **规划大纲** — 「为这个系列规划 5 篇文章」
· **按大纲建文** — 「按大纲创建文章」
· **一键生成** — 「一键生成」（需绑定系列）
· **系列状态** — 「查看系列进度」
· **同步知识库** — 「同步知识库」

在系列详情页打开大管家，会自动绑定当前系列。`;

export async function chatReply(
  ctx: ButlerContext,
  params: { hint?: boolean; topicId?: string }
): Promise<ToolResult> {
  if (params.hint) {
    return { reply: HELP_TEXT };
  }

  try {
    const model = resolveChatModel('deepseek-chat');
    const topicNote =
      (params.topicId ?? ctx.topicId)
        ? '当前会话已绑定系列，用户可直接说「规划大纲」「一键生成」等。'
        : '当前会话未绑定系列，建议用户先去系列详情页打开大管家。';

    const content = await streamChat({
      model,
      messages: [
        {
          role: 'system',
          content: `你是内容运营中台的大管家助手。${topicNote}\n\n可用能力：${listAvailableTools().join('、')}\n\n回复简洁友好，若用户意图明确则引导使用上述指令。`,
        },
        { role: 'user', content: ctx.message },
      ],
      temperature: 0.5,
      onDelta: ctx.onDelta,
    });

    return {
      reply: content.trim() || HELP_TEXT,
      actions: [{ type: 'view_topic', label: '系列管理', href: '/topics' }],
    };
  } catch {
    return { reply: HELP_TEXT };
  }
}
