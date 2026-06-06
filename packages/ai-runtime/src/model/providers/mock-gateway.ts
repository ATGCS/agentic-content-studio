import type { ChatMessage, ChatOutput, ModelGateway } from '../types.js';

export class MockModelGateway implements ModelGateway {
  async chat(input: { messages: ChatMessage[] }): Promise<ChatOutput> {
    const last = input.messages[input.messages.length - 1]?.content ?? '';
    if (last.includes('标题') || last.includes('titles')) {
      return {
        content: JSON.stringify({
          titles: [
            'AI 内容运营实战指南',
            '一文读懂智能内容中台',
            '从选题到复盘的全流程',
          ],
        }),
      };
    }
    if (last.includes('正文') || last.includes('body')) {
      return {
        content: JSON.stringify({
          body: '## 引言\n\n这是一篇由 Agentic Content Studio 生成的示例正文。\n\n## 核心观点\n\n1. 选题驱动\n2. 多平台适配\n3. 审核后发布',
        }),
      };
    }
    if (
      last.includes('改写') ||
      last.includes('rewrite') ||
      last.includes('platform')
    ) {
      return {
        content: JSON.stringify({
          title: '【小红书】AI 内容运营笔记',
          body: '姐妹们！这篇笔记带你搞懂 AI 内容运营～\n\n#AI运营 #内容中台',
          coverText: '搞懂 AI 运营',
          tags: ['AI运营', '内容中台'],
        }),
      };
    }
    if (last.includes('审核') || last.includes('review')) {
      return {
        content: JSON.stringify({
          passed: true,
          checks: [{ name: '敏感词', ok: true, detail: '无' }],
          riskLevel: 'low',
        }),
      };
    }
    return {
      content: JSON.stringify({
        summary: '内容表现良好，建议继续同类选题。',
        insights: ['标题吸引力较高', '互动率高于均值'],
        suggestions: ['增加小红书版本', '尝试视频脚本 Agent'],
      }),
    };
  }
}
