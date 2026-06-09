/** Agent 运行时类型 → 本地知识库 agentType 匹配优先级 */
const AGENT_KB_TYPES: Record<string, string[]> = {
  TOPIC: ['TOPIC'],
  TITLE: ['TITLE'],
  BODY: ['BODY'],
  REWRITE: ['BODY', 'REWRITE'],
  TAG: ['TAG'],
  IMAGE: ['COVER', 'MATERIAL'],
  COVER_COPY: ['COVER'],
  REVIEW: ['BODY', 'PLATFORM_RULE'],
  SUMMARY: ['BODY'],
  VIDEO_SCRIPT: ['BODY', 'MATERIAL'],
  COMPETITOR: ['BODY'],
};

export function resolveKbAgentTypes(agentType?: string): string[] | undefined {
  if (!agentType) return undefined;
  return AGENT_KB_TYPES[agentType];
}
