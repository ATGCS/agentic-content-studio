import type { AgentType } from '@acs/db';

export type AgentTier = 'pipeline' | 'on-demand' | 'deprecated' | 'analytics';

export type AgentCatalogEntry = {
  type: AgentType;
  label: string;
  tier: AgentTier;
  /** 在一键生成主流程中是否自动执行 */
  inPipeline: boolean;
  description: string;
  /** 若已合并到其他 Agent，指向替代者 */
  mergedInto?: AgentType;
};

/**
 * Agent 分层说明（不是越多越好）：
 *
 * 主流程 3 步：母稿(BODY) → 平台改写(REWRITE) → 封面(IMAGE)
 * - BODY 已合并原 TITLE（一次出标题+正文）
 * - REWRITE 已包含 coverText + tags，无需单独 COVER_COPY / TAG
 */
export const agentCatalog: AgentCatalogEntry[] = [
  {
    type: 'BODY',
    label: '母稿生成',
    tier: 'pipeline',
    inPipeline: true,
    description: '一次生成标题候选 + 正文（合并原 TITLE Agent）',
    mergedInto: undefined,
  },
  {
    type: 'REWRITE',
    label: '平台改写',
    tier: 'pipeline',
    inPipeline: true,
    description: '按平台重写标题/正文/封面文案/标签',
  },
  {
    type: 'IMAGE',
    label: '封面绘图',
    tier: 'pipeline',
    inPipeline: true,
    description: '生成绘图提示词并调用图片 API 出封面',
  },
  {
    type: 'TITLE',
    label: '标题重做',
    tier: 'on-demand',
    inPipeline: false,
    description: '仅重新生成标题候选，主流程已由 BODY 覆盖',
  },
  {
    type: 'REVIEW',
    label: '合规审核',
    tier: 'on-demand',
    inPipeline: false,
    description: '发布前风险与合规检查',
  },
  {
    type: 'SUMMARY',
    label: '数据复盘',
    tier: 'analytics',
    inPipeline: false,
    description: '基于投放数据生成复盘摘要',
  },
  {
    type: 'TAG',
    label: '标签生成',
    tier: 'deprecated',
    inPipeline: false,
    description: '已合并进 REWRITE 的 tags 字段',
    mergedInto: 'REWRITE',
  },
  {
    type: 'COVER_COPY',
    label: '封面文案',
    tier: 'deprecated',
    inPipeline: false,
    description: '已合并进 REWRITE 的 coverText 字段',
    mergedInto: 'REWRITE',
  },
  {
    type: 'TOPIC',
    label: '选题生成',
    tier: 'on-demand',
    inPipeline: false,
    description: '从知识库/趋势生成选题（独立场景）',
  },
  {
    type: 'VIDEO_SCRIPT',
    label: '视频脚本',
    tier: 'on-demand',
    inPipeline: false,
    description: '短视频分镜脚本（独立场景）',
  },
  {
    type: 'COMPETITOR',
    label: '竞品分析',
    tier: 'on-demand',
    inPipeline: false,
    description: '竞品内容分析（独立场景）',
  },
];

export const productionPipelineAgents = agentCatalog.filter(
  (entry) => entry.inPipeline
);

export function getAgentCatalogEntry(type: AgentType) {
  return agentCatalog.find((entry) => entry.type === type);
}

export function isDeprecatedAgent(type: AgentType) {
  return getAgentCatalogEntry(type)?.tier === 'deprecated';
}
