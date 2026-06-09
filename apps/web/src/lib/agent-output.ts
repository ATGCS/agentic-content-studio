export type AgentResultItem = {
  id: string;
  content: string;
  subtitle?: string;
  status: string;
  output?: unknown;
};

export function parseAgentOutput(
  agentType: string | undefined,
  output: unknown,
  runId: string
): AgentResultItem[] {
  if (!output || typeof output !== 'object') return [];
  const o = output as Record<string, unknown>;

  switch (agentType) {
    case 'TITLE': {
      const titles = Array.isArray(o.titles) ? o.titles : [];
      return titles.map((title, i) => ({
        id: `${runId}-title-${i}`,
        content: String(title),
        status: 'SUCCESS',
      }));
    }
    case 'BODY':
      return [
        {
          id: `${runId}-body`,
          content: typeof o.body === 'string' ? o.body : '',
          status: 'SUCCESS',
        },
      ];
    case 'REWRITE': {
      const title = typeof o.title === 'string' ? o.title : '';
      const body = typeof o.body === 'string' ? o.body : '';
      return [
        {
          id: `${runId}-rewrite`,
          content: title || body,
          subtitle: title && body ? body : undefined,
          status: 'SUCCESS',
          output: o,
        },
      ];
    }
    case 'SUMMARY': {
      const summary = typeof o.summary === 'string' ? o.summary : '';
      return summary
        ? [{ id: `${runId}-summary`, content: summary, status: 'SUCCESS' }]
        : [];
    }
    case 'REVIEW': {
      const passed = o.passed === true ? '通过' : '未通过';
      const risk = typeof o.riskLevel === 'string' ? o.riskLevel : '';
      return [
        {
          id: `${runId}-review`,
          content: `审核结果：${passed}${risk ? `（风险：${risk}）` : ''}`,
          subtitle: JSON.stringify(o.checks ?? [], null, 2),
          status: 'SUCCESS',
        },
      ];
    }
    default:
      return [
        {
          id: runId,
          content: JSON.stringify(o, null, 2),
          status: 'SUCCESS',
        },
      ];
  }
}
