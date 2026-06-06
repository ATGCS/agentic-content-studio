import type { Platform } from '@acs/db';
import { oauthPublicBase, platformToSlug } from '../platform-slug.js';

export interface PlatformAdapter {
  buildAuthorizeUrl(params: {
    state: string;
    redirectUri: string;
    scopes?: string[];
  }): string;
  exchangeCode(params: {
    code: string;
    redirectUri: string;
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshExpiresIn?: number;
    scopes?: string[];
    rawData?: Record<string, unknown>;
  }>;
  getAccountProfile(params: {
    accessToken: string;
  }): Promise<{
    externalAccountId: string;
    accountName: string;
    avatarUrl?: string;
    rawData?: Record<string, unknown>;
  }>;
  refreshToken?(params: {
    refreshToken: string;
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>;
  revokeToken?(params: {
    accessToken: string;
  }): Promise<void>;
  syncWorks?(params: {
    accountId: string;
    accessToken: string;
  }): Promise<Array<{
    platformWorkId: string;
    workType?: string;
    title?: string;
    coverUrl?: string;
    url?: string;
    publishedAt?: Date;
    duration?: number;
    status?: string;
    rawData?: Record<string, unknown>;
  }>>;
  syncMetrics?(params: {
    platformWorkId: string;
    accessToken: string;
  }): Promise<{
    playCount?: number;
    readCount?: number;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    favoriteCount?: number;
    collectCount?: number;
    coinCount?: number;
    avgWatchDuration?: number;
    avgWatchProgress?: number;
    completionRate?: number | null;
    rawData?: Record<string, unknown>;
  }>;
}

function envOr(key: string, fallback?: string): string {
  const val = process.env[key];
  if (!val) {
    if (fallback !== undefined) return fallback;
    throw new Error(`env ${key} is not set`);
  }
  return val;
}

function buildDouyinAuthorizeUrl({ state, redirectUri, scopes }: {
  state: string;
  redirectUri: string;
  scopes?: string[];
}): string {
  const clientKey = envOr('DOUYIN_CLIENT_KEY');
  const scopeStr = scopes?.join(',') ?? '';
  return `https://open.douyin.com/platform/oauth/connect?client_key=${encodeURIComponent(clientKey)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopeStr)}&response_type=code`;
}

function buildKuaishouAuthorizeUrl({ state, redirectUri, scopes }: {
  state: string;
  redirectUri: string;
  scopes?: string[];
}): string {
  const appId = envOr('KUAISHOU_APP_ID');
  const scopeStr = scopes?.join(' ') ?? '';
  return `https://open.kuaishou.com/oauth2/authorize?app_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopeStr)}&response_type=code`;
}

function buildWeChatOAAuthorizeUrl({ state, redirectUri, scopes }: {
  state: string;
  redirectUri: string;
  scopes?: string[];
}): string {
  const appId = envOr('WECHAT_OA_APP_ID');
  const scopeStr = scopes?.join(',') ?? 'snsapi_base';
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopeStr)}&response_type=code#wechat_redirect`;
}

function buildBilibiliAuthorizeUrl({ state, redirectUri, scopes }: {
  state: string;
  redirectUri: string;
  scopes?: string[];
}): string {
  const appId = envOr('BILIBILI_APP_ID');
  const scopeStr = scopes?.join(' ') ?? '';
  return `https://passport.bilibili.com/api/oauth2/authorize?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopeStr)}&response_type=code`;
}

function buildDevAuthorizeUrl({ platform, state }: {
  platform: Platform;
  state: string;
}): string {
  const slug = platformToSlug(platform);
  const base = oauthPublicBase();
  return `${base}/api/oauth/${slug}/dev-authorize?state=${encodeURIComponent(state)}`;
}

function useMockOAuth(platform: Platform): boolean {
  if (process.env.USE_MOCK_OAUTH === 'true') return true;
  if (process.env.USE_MOCK_OAUTH === 'false') return false;
  if (process.env.NODE_ENV === 'production') return false;
  switch (platform) {
    case 'DOUYIN':
      return !process.env.DOUYIN_CLIENT_KEY;
    case 'KUAISHOU':
      return !process.env.KUAISHOU_APP_ID;
    case 'WECHAT':
      return !process.env.WECHAT_OA_APP_ID;
    case 'BILIBILI':
      return !process.env.BILIBILI_APP_ID;
    default:
      return true;
  }
}

function mockAdapter(platform: Platform): PlatformAdapter {
  return {
    buildAuthorizeUrl: (p) => buildDevAuthorizeUrl({ platform, state: p.state }),
    exchangeCode: async () => mockExchange(),
    getAccountProfile: async () => mockProfile(platform),
    revokeToken: async () => {},
    syncWorks: async () => mockWorks(platform),
    syncMetrics: async () => mockMetrics(platform),
  };
}

export function getAdapter(platform: Platform): PlatformAdapter {
  if (useMockOAuth(platform)) {
    return mockAdapter(platform);
  }

  if (platform === 'DOUYIN') {
    return {
      buildAuthorizeUrl: (p) => buildDouyinAuthorizeUrl(p),
      exchangeCode: async () => mockExchange(),
      getAccountProfile: async () => mockProfile('抖音'),
      revokeToken: async () => {},
      syncWorks: async () => mockWorks('DOUYIN'),
      syncMetrics: async () => mockMetrics('DOUYIN'),
    };
  }

  if (platform === 'KUAISHOU') {
    return {
      buildAuthorizeUrl: (p) => buildKuaishouAuthorizeUrl(p),
      exchangeCode: async () => mockExchange(),
      getAccountProfile: async () => mockProfile('快手'),
      revokeToken: async () => {},
      syncWorks: async () => mockWorks('KUAISHOU'),
      syncMetrics: async () => mockMetrics('KUAISHOU'),
    };
  }

  if (platform === 'WECHAT') {
    return {
      buildAuthorizeUrl: (p) => buildWeChatOAAuthorizeUrl(p),
      exchangeCode: async () => mockExchange(),
      getAccountProfile: async () => mockProfile('微信公众号'),
      revokeToken: async () => {},
      syncWorks: async () => mockWorks('WECHAT'),
      syncMetrics: async () => mockMetrics('WECHAT'),
    };
  }

  if (platform === 'BILIBILI') {
    return {
      buildAuthorizeUrl: (p) => buildBilibiliAuthorizeUrl(p),
      exchangeCode: async () => mockExchange(),
      getAccountProfile: async () => mockProfile('B站'),
      revokeToken: async () => {},
      syncWorks: async () => mockWorks('BILIBILI'),
      syncMetrics: async () => mockMetrics('BILIBILI'),
    };
  }

  if (platform === 'ZHIHU') {
    return {
      buildAuthorizeUrl: () => {
        throw new Error('知乎暂不支持官方自动同步，请使用手动导入');
      },
      exchangeCode: async () => {
        throw new Error('知乎暂不支持官方自动同步');
      },
      getAccountProfile: async () => {
        throw new Error('知乎暂不支持官方自动同步');
      },
      revokeToken: async () => {},
      syncWorks: async () => {
        throw new Error('知乎暂不支持官方自动同步，请使用手动导入');
      },
      syncMetrics: async () => {
        throw new Error('知乎暂不支持官方自动同步');
      },
    };
  }

  return mockAdapter(platform);
}

async function mockExchange() {
  return {
    accessToken: `mock_at_${Date.now()}`,
    refreshToken: `mock_rt_${Date.now()}`,
    expiresIn: 7200,
    refreshExpiresIn: 30 * 24 * 3600,
    scopes: ['basic'],
    rawData: { mock: true },
  };
}

const platformLabels: Record<string, string> = {
  WECHAT: '微信公众号',
  XIAOHONGSHU: '小红书',
  DOUYIN: '抖音',
  KUAISHOU: '快手',
  VIDEO_CHANNEL: '视频号',
  BILIBILI: 'B站',
  ZHIHU: '知乎',
  OTHER: '其他',
};

async function mockProfile(platform: string) {
  const label = platformLabels[platform] ?? platform;
  return {
    externalAccountId: `ext_${platform}_${Date.now()}`,
    accountName: `Mock ${label}`,
    avatarUrl: undefined as string | undefined,
    rawData: { mock: true },
  };
}

async function mockWorks(platform: string) {
  const now = new Date();
  return [
    {
      platformWorkId: `work_${platform.toLowerCase()}_001`,
      workType: platform === 'WECHAT' ? 'article' : 'video',
      title: `${platform} 测试作品 1`,
      coverUrl: undefined as string | undefined,
      url: `https://example.com/${platform.toLowerCase()}/001`,
      publishedAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
      duration: platform === 'WECHAT' ? undefined : 60,
      status: 'published',
      rawData: { mock: true },
    },
    {
      platformWorkId: `work_${platform.toLowerCase()}_002`,
      workType: platform === 'WECHAT' ? 'article' : 'video',
      title: `${platform} 测试作品 2`,
      coverUrl: undefined as string | undefined,
      url: `https://example.com/${platform.toLowerCase()}/002`,
      publishedAt: new Date(now.getTime() - 7 * 24 * 3600 * 1000),
      duration: platform === 'WECHAT' ? undefined : 120,
      status: 'published',
      rawData: { mock: true },
    },
  ];
}

async function mockMetrics(platform: string) {
  const base: Record<string, unknown> = {
    playCount: Math.floor(Math.random() * 10000) + 100,
    likeCount: Math.floor(Math.random() * 500) + 10,
    commentCount: Math.floor(Math.random() * 200) + 5,
    shareCount: Math.floor(Math.random() * 100) + 1,
    favoriteCount: Math.floor(Math.random() * 300) + 5,
    collectCount: Math.floor(Math.random() * 200) + 3,
    completionRate: null,
  };

  if (platform === 'BILIBILI') {
    base.coinCount = Math.floor(Math.random() * 100) + 1;
    base.avgWatchDuration = Math.floor(Math.random() * 120) + 30;
    base.avgWatchProgress = Math.round((Math.random() * 0.8 + 0.1) * 100) / 100;
  }

  if (platform === 'WECHAT') {
    base.readCount = base.playCount;
    delete base.playCount;
  }

  return base;
}
