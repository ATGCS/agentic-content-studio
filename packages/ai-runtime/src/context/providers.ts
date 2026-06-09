import { prisma } from '@acs/db';
import { getProfileByAccountId } from '@acs/account-profile';
import { buildImaSearchQuery, searchLocalKnowledge } from '@acs/ima-provider';
import { resolveKbAgentTypes } from '../knowledge/kb-agent-resolver.js';
import { getPlatformBodyGuide } from '../prompt/platform-body-guides.js';
import { getPlatformCoverGuide } from '../prompt/platform-cover-guides.js';
import { IMA_METHODOLOGY_PREFIX } from '../prompt/agent-system-prompts.js';
import { buildSeriesContext, MAX_SIBLINGS } from './series-context.js';
import type { ContextProvider } from './types.js';

export const contentBasicProvider: ContextProvider = {
  id: 'content.basic',
  async build(input) {
    const content = await prisma.content.findUnique({
      where: { id: input.contentId },
      include: { topic: true },
    });
    if (!content) throw new Error('content not found');

    const bodyRaw = content.body ?? '';
    const bodyExcerpt =
      bodyRaw.length > 1600 ? `${bodyRaw.slice(0, 1600)}…` : bodyRaw;

    return {
      topicTitle: content.topic?.title ?? content.title,
      topicDesc: content.topic?.description ?? '',
      title: content.title,
      body: bodyRaw,
      bodyExcerpt,
      summary: content.summary ?? '',
    };
  },
};

export const seriesSiblingsProvider: ContextProvider = {
  id: 'series.siblings',
  async build(input) {
    const content = await prisma.content.findUnique({
      where: { id: input.contentId },
      include: { topic: true },
    });
    if (!content?.topicId) {
      return { seriesContext: '', seriesSiblingCount: '0' };
    }

    const siblings = await prisma.content.findMany({
      where: {
        topicId: content.topicId,
        id: { not: input.contentId },
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_SIBLINGS,
      select: {
        title: true,
        summary: true,
        body: true,
        createdAt: true,
      },
    });

    const withContent = siblings.filter(
      (item) => item.summary?.trim() || item.body?.trim()
    );

    const topicTitle = content.topic?.title ?? content.title;
    const seriesContext = buildSeriesContext({
      topicTitle,
      siblings: withContent,
    });

    return {
      seriesContext,
      seriesSiblingCount: String(withContent.length),
    };
  },
};

export const knowledgeLocalProvider: ContextProvider = {
  id: 'knowledge.local',
  async build(input) {
    const content = await prisma.content.findUnique({
      where: { id: input.contentId },
      include: { topic: true },
    });

    const query = buildImaSearchQuery({
      title: content?.title,
      summary: content?.summary,
      topicTitle: content?.topic?.title,
      topicDesc: content?.topic?.description,
      platform: input.platform,
    });

    const result = await searchLocalKnowledge({
      query,
      kbAgentTypes: resolveKbAgentTypes(input.agentType),
      limit: 8,
    });

    const raw = result.summary;
    const imaSummary = raw ? `${IMA_METHODOLOGY_PREFIX}${raw}` : '';

    return { imaSummary };
  },
};

/** @deprecated 使用 knowledge.local */
export const knowledgeImaLatestProvider = knowledgeLocalProvider;

export const accountProfileProvider: ContextProvider = {
  id: 'account.profile',
  async build(input) {
    if (!input.accountId) {
      return {
        accountStyle: '',
        accountPositioning: '',
        accountTone: '',
        accountContentBoundary: '',
      };
    }

    const profile = await getProfileByAccountId(input.accountId);
    return {
      accountStyle: profile?.contentStyle ?? profile?.positioning ?? '',
      accountPositioning: profile?.positioning ?? '',
      accountTone: profile?.tone ?? '',
      accountContentBoundary: profile?.contentBoundary ?? '',
    };
  },
};

export const runtimeOverridesProvider: ContextProvider = {
  id: 'runtime.overrides',
  async build(input) {
    const platform = String(input.platform ?? 'WECHAT');
    return {
      platform,
      count: String(input.count ?? 5),
      imageRole: String(input.imageRole ?? 'COVER'),
      platformCoverGuide: getPlatformCoverGuide(platform),
      platformBodyGuide: getPlatformBodyGuide(platform),
    };
  },
};

export const versionCurrentProvider: ContextProvider = {
  id: 'version.current',
  async build(input) {
    if (!input.versionId) {
      return {
        versionTitle: '',
        versionBody: '',
        versionCoverText: '',
        versionTags: '',
        platform: String(input.platform ?? 'WECHAT'),
      };
    }

    const version = await prisma.contentVersion.findUnique({
      where: { id: input.versionId },
    });
    if (!version) throw new Error('version not found');

    const tags = Array.isArray(version.tags)
      ? version.tags.filter((tag): tag is string => typeof tag === 'string')
      : [];

    return {
      versionTitle: version.title ?? '',
      versionBody: version.body ?? '',
      versionCoverText: version.coverText ?? '',
      versionTags: tags.join(', '),
      platform: version.platform,
    };
  },
};

export const analyticsContentProvider: ContextProvider = {
  id: 'analytics.content',
  async build(input) {
    const rows = await prisma.analyticsData.findMany({
      where: { contentId: input.contentId },
      orderBy: { collectedAt: 'desc' },
      take: 50,
    });

    const totals = rows.reduce(
      (acc, row) => ({
        views: acc.views + row.views,
        likes: acc.likes + row.likes,
        comments: acc.comments + row.comments,
        shares: acc.shares + row.shares,
        collects: acc.collects + row.collects,
      }),
      { views: 0, likes: 0, comments: 0, shares: 0, collects: 0 }
    );

    return {
      analyticsSummary: JSON.stringify({ totalRecords: rows.length, totals }),
    };
  },
};

export const defaultContextProviders = [
  contentBasicProvider,
  seriesSiblingsProvider,
  knowledgeLocalProvider,
  accountProfileProvider,
  runtimeOverridesProvider,
  versionCurrentProvider,
  analyticsContentProvider,
];
