import type { Platform } from '@acs/db';
import type { PlatformOAuthConfig } from '../oauth-config.js';

export interface PlatformAdapter {
  buildAuthorizeUrl(params: {
    state: string;
    redirectUri: string;
    scopes?: string[];
  }): string;
  exchangeCode(params: { code: string; redirectUri: string }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshExpiresIn?: number;
    scopes?: string[];
    rawData?: Record<string, unknown>;
  }>;
  getAccountProfile(params: { accessToken: string }): Promise<{
    externalAccountId: string;
    accountName: string;
    avatarUrl?: string;
    rawData?: Record<string, unknown>;
  }>;
  refreshToken?(params: { refreshToken: string }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>;
  revokeToken?(params: { accessToken: string }): Promise<void>;
  syncWorks?(params: { accountId: string; accessToken: string }): Promise<
    Array<{
      platformWorkId: string;
      workType?: string;
      title?: string;
      coverUrl?: string;
      url?: string;
      publishedAt?: Date;
      duration?: number;
      status?: string;
      rawData?: Record<string, unknown>;
    }>
  >;
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

function cfgVal(
  dbCfg: PlatformOAuthConfig | undefined,
  platform: string,
  keys: string[]
): string | undefined {
  // DB config takes priority
  const p = (dbCfg as Record<string, Record<string, string> | undefined>)?.[
    platform
  ];
  for (const key of keys) {
    const v = p?.[key];
    if (v) return v;
  }
  // Fallback to env
  for (const key of keys) {
    const envKey =
      key === 'appId'
        ? `${platform}_APP_ID`.toUpperCase()
        : key === 'appSecret'
          ? `${platform}_APP_SECRET`.toUpperCase()
          : key === 'clientKey'
            ? `${platform}_CLIENT_KEY`.toUpperCase()
            : key === 'clientSecret'
              ? `${platform}_CLIENT_SECRET`.toUpperCase()
              : key.toUpperCase();
    const v = process.env[envKey];
    if (v) return v;
  }
  return undefined;
}

const PLATFORM_NAMES: Record<string, string> = {
  WECHAT: '微信公众号',
  DOUYIN: '抖音',
  KUAISHOU: '快手',
  BILIBILI: 'B站',
  ZHIHU: '知乎',
  XIAOHONGSHU: '小红书',
  VIDEO_CHANNEL: '微信视频号',
};

export function getAdapter(
  platform: Platform,
  dbConfig?: PlatformOAuthConfig
): PlatformAdapter {
  const name = PLATFORM_NAMES[platform] ?? platform;

  switch (platform) {
    case 'WECHAT': {
      const appId =
        cfgVal(dbConfig, 'wechat', ['appId']) ?? process.env.WECHAT_OA_APP_ID;
      const appSecret =
        cfgVal(dbConfig, 'wechat', ['appSecret']) ??
        process.env.WECHAT_OA_APP_SECRET;
      if (!appId || !appSecret) {
        throw new Error(
          `「${name}」未配置 AppID / AppSecret\n\n请在「账号管理 → OAuth 配置」中填写，或在 .env 中设置 WECHAT_OA_APP_ID / WECHAT_OA_APP_SECRET`
        );
      }
      return buildWeChatAdapter(appId);
    }

    case 'DOUYIN': {
      const key =
        cfgVal(dbConfig, 'douyin', ['clientKey']) ??
        process.env.DOUYIN_CLIENT_KEY;
      const secret =
        cfgVal(dbConfig, 'douyin', ['clientSecret']) ??
        process.env.DOUYIN_CLIENT_SECRET;
      if (!key || !secret) {
        throw new Error(
          `「${name}」未配置 ClientKey / ClientSecret\n\n请在「账号管理 → OAuth 配置」中填写，或在 .env 中设置 DOUYIN_CLIENT_KEY / DOUYIN_CLIENT_SECRET`
        );
      }
      return buildDouyinAdapter(key);
    }

    case 'KUAISHOU': {
      const appId =
        cfgVal(dbConfig, 'kuaishou', ['appId']) ?? process.env.KUAISHOU_APP_ID;
      const appSecret =
        cfgVal(dbConfig, 'kuaishou', ['appSecret']) ??
        process.env.KUAISHOU_APP_SECRET;
      if (!appId || !appSecret) {
        throw new Error(
          `「${name}」未配置 AppID / AppSecret\n\n请在「账号管理 → OAuth 配置」中填写，或在 .env 中设置 KUAISHOU_APP_ID / KUAISHOU_APP_SECRET`
        );
      }
      return buildKuaishouAdapter(appId);
    }

    case 'BILIBILI': {
      const appId =
        cfgVal(dbConfig, 'bilibili', ['appId']) ?? process.env.BILIBILI_APP_ID;
      const appSecret =
        cfgVal(dbConfig, 'bilibili', ['appSecret']) ??
        process.env.BILIBILI_APP_SECRET;
      if (!appId || !appSecret) {
        throw new Error(
          `「${name}」未配置 AppID / AppSecret\n\n请在「账号管理 → OAuth 配置」中填写，或在 .env 中设置 BILIBILI_APP_ID / BILIBILI_APP_SECRET`
        );
      }
      return buildBilibiliAdapter(appId);
    }

    case 'ZHIHU':
      return buildZhihuAdapter();

    case 'XIAOHONGSHU':
    case 'VIDEO_CHANNEL':
    case 'OTHER':
    default:
      return buildUnsupportedAdapter(name);
  }
}

/* ---- platform-specific adapter builders ---- */

function buildWeChatAdapter(appId: string): PlatformAdapter {
  return {
    buildAuthorizeUrl: ({ state, redirectUri, scopes }) => {
      const scopeStr = scopes?.join(',') ?? 'snsapi_base';
      return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopeStr)}&response_type=code#wechat_redirect`;
    },
    exchangeCode: () => notImplemented('微信公众号 exchangeCode'),
    getAccountProfile: () => notImplemented('微信公众号 getAccountProfile'),
    revokeToken: () => notImplemented('微信公众号 revokeToken'),
    syncWorks: () => notImplemented('微信公众号 syncWorks'),
    syncMetrics: () => notImplemented('微信公众号 syncMetrics'),
  };
}

function buildDouyinAdapter(clientKey: string): PlatformAdapter {
  return {
    buildAuthorizeUrl: ({ state, redirectUri, scopes }) => {
      const scopeStr = scopes?.join(',') ?? '';
      return `https://open.douyin.com/platform/oauth/connect?client_key=${encodeURIComponent(clientKey)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopeStr)}&response_type=code`;
    },
    exchangeCode: () => notImplemented('抖音 exchangeCode'),
    getAccountProfile: () => notImplemented('抖音 getAccountProfile'),
    revokeToken: () => notImplemented('抖音 revokeToken'),
    syncWorks: () => notImplemented('抖音 syncWorks'),
    syncMetrics: () => notImplemented('抖音 syncMetrics'),
  };
}

function buildKuaishouAdapter(appId: string): PlatformAdapter {
  return {
    buildAuthorizeUrl: ({ state, redirectUri, scopes }) => {
      const scopeStr = scopes?.join(' ') ?? '';
      return `https://open.kuaishou.com/oauth2/authorize?app_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopeStr)}&response_type=code`;
    },
    exchangeCode: () => notImplemented('快手 exchangeCode'),
    getAccountProfile: () => notImplemented('快手 getAccountProfile'),
    revokeToken: () => notImplemented('快手 revokeToken'),
    syncWorks: () => notImplemented('快手 syncWorks'),
    syncMetrics: () => notImplemented('快手 syncMetrics'),
  };
}

function buildBilibiliAdapter(appId: string): PlatformAdapter {
  return {
    buildAuthorizeUrl: ({ state, redirectUri, scopes }) => {
      const scopeStr = scopes?.join(' ') ?? '';
      return `https://passport.bilibili.com/api/oauth2/authorize?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopeStr)}&response_type=code`;
    },
    exchangeCode: () => notImplemented('B站 exchangeCode'),
    getAccountProfile: () => notImplemented('B站 getAccountProfile'),
    revokeToken: () => notImplemented('B站 revokeToken'),
    syncWorks: () => notImplemented('B站 syncWorks'),
    syncMetrics: () => notImplemented('B站 syncMetrics'),
  };
}

function buildZhihuAdapter(): PlatformAdapter {
  return {
    buildAuthorizeUrl: () => {
      throw new Error(
        '知乎暂不支持官方 OAuth 授权，请在知乎平台手动绑定账号后，在系统设置中录入外部账号 ID。'
      );
    },
    exchangeCode: () => notImplementedZhihu(),
    getAccountProfile: () => notImplementedZhihu(),
    revokeToken: async () => {},
    syncWorks: () => notImplementedZhihu(),
    syncMetrics: () => notImplementedZhihu(),
  };
}

function buildUnsupportedAdapter(platformName: string): PlatformAdapter {
  return {
    buildAuthorizeUrl: () => {
      throw new Error(
        `「${platformName}」的平台适配器尚未实现，无法发起 OAuth 授权。请先实现该平台的 PlatformAdapter。`
      );
    },
    exchangeCode: () => notImplemented(`${platformName} exchangeCode`),
    getAccountProfile: () =>
      notImplemented(`${platformName} getAccountProfile`),
    revokeToken: async () => {},
    syncWorks: () => notImplemented(`${platformName} syncWorks`),
    syncMetrics: () => notImplemented(`${platformName} syncMetrics`),
  };
}

/* ---- helpers ---- */

async function notImplemented(name: string): Promise<never> {
  throw new Error(`${name} 接口尚未实现，请先实现该平台的 PlatformAdapter。`);
}

async function notImplementedZhihu(): Promise<never> {
  throw new Error('知乎暂不支持官方自动同步，请使用手动导入。');
}
