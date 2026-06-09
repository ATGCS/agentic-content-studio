import type { AgentSpec } from '../runtime/types.js';

const contentGenerationContext = [
  'content.basic',
  'series.siblings',
  'knowledge.local',
  'account.profile',
  'runtime.overrides',
];

export const defaultAgentSpecs: AgentSpec[] = [
  {
    type: 'TITLE',
    contextProviders: contentGenerationContext,
    parser: 'title',
    applier: 'title',
  },
  {
    type: 'BODY',
    contextProviders: contentGenerationContext,
    parser: 'body',
    applier: 'body',
  },
  {
    type: 'REWRITE',
    contextProviders: [
      'content.basic',
      'series.siblings',
      'version.current',
      'knowledge.local',
      'account.profile',
      'runtime.overrides',
    ],
    parser: 'rewrite',
    applier: 'rewrite',
  },
  {
    type: 'REVIEW',
    contextProviders: [
      'content.basic',
      'version.current',
      'account.profile',
      'runtime.overrides',
    ],
    parser: 'review',
    applier: 'noop',
  },
  {
    type: 'SUMMARY',
    contextProviders: [
      'content.basic',
      'analytics.content',
      'runtime.overrides',
    ],
    parser: 'summary',
    applier: 'noop',
  },
  {
    type: 'TAG',
    contextProviders: contentGenerationContext,
    parser: 'tag',
    applier: 'noop',
  },
  {
    type: 'IMAGE',
    contextProviders: [
      'content.basic',
      'series.siblings',
      'version.current',
      'knowledge.local',
      'account.profile',
      'runtime.overrides',
    ],
    parser: 'image',
    applier: 'image',
  },
  {
    type: 'VIDEO_SCRIPT',
    contextProviders: contentGenerationContext,
    parser: 'videoScript',
    applier: 'noop',
  },
  {
    type: 'TOPIC',
    contextProviders: contentGenerationContext,
    parser: 'topic',
    applier: 'noop',
  },
  {
    type: 'COVER_COPY',
    contextProviders: contentGenerationContext,
    parser: 'coverCopy',
    applier: 'noop',
  },
  {
    type: 'COMPETITOR',
    contextProviders: contentGenerationContext,
    parser: 'competitor',
    applier: 'noop',
  },
];
