import { prisma } from '@acs/db';
import { getProfileByAccountId } from '@acs/account-profile';
import { IMA_METHODOLOGY_PREFIX } from '../prompt/agent-system-prompts.js';
import type { ContextProvider } from './types.js';

export const contentBasicProvider: ContextProvider = {
  id: 'content.basic',
  async build(input) {
    const content = await prisma.content.findUnique({
      where: { id: input.contentId },
      include: { topic: true },
    });
    if (!content) throw new Error('content not found');

    return {
      topicTitle: content.topic?.title ?? content.title,
      topicDesc: content.topic?.description ?? '',
      title: content.title,
      body: content.body ?? '',
      summary: content.summary ?? '',
    };
  },
};

export const knowledgeImaLatestProvider: ContextProvider = {
  id: 'knowledge.ima.latest',
  async build(input) {
    const lastIma = await prisma.imaSearchLog.findFirst({
      where: { contentId: input.contentId },
      orderBy: { createdAt: 'desc' },
    });

    const raw = lastIma?.resultSummary ?? '';
    const imaSummary = raw ? `${IMA_METHODOLOGY_PREFIX}${raw}` : '';

    return { imaSummary };
  },
};

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
    return {
      platform: String(input.platform ?? 'WECHAT'),
      count: String(input.count ?? 5),
      imageRole: String(input.imageRole ?? 'COVER'),
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
  knowledgeImaLatestProvider,
  accountProfileProvider,
  runtimeOverridesProvider,
  versionCurrentProvider,
  analyticsContentProvider,
];
