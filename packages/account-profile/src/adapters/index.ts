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
  getAccountProfile(params: { accessToken: string; openId?: string }): Promise<{
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
          `「${name}」尚未配置开发者凭证\n\n请由管理员在「账号管理 → OAuth 配置」中填写 AppID / AppSecret（全站只需配置一次）`
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
          `「${name}」尚未配置开发者凭证\n\n请由管理员在「账号管理 → OAuth 配置」中填写 ClientKey / ClientSecret（全站只需配置一次）`
        );
      }
      return buildDouyinAdapter(key, secret);
    }

    case 'KUAISHOU': {
      const appId =
        cfgVal(dbConfig, 'kuaishou', ['appId']) ?? process.env.KUAISHOU_APP_ID;
      const appSecret =
        cfgVal(dbConfig, 'kuaishou', ['appSecret']) ??
        process.env.KUAISHOU_APP_SECRET;
      if (!appId || !appSecret) {
        throw new Error(
          `「${name}」尚未配置开发者凭证\n\n请由管理员在「账号管理 → OAuth 配置」中填写 AppID / AppSecret（全站只需配置一次）`
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
          `「${name}」尚未配置开发者凭证\n\n请由管理员在「账号管理 → OAuth 配置」中填写 AppID / AppSecret（全站只需配置一次）`
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

type DouyinApiData = {
  error_code?: number;
  description?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  scope?: string;
  open_id?: string;
  nickname?: string;
  avatar?: string;
};

async function douyinPostJson<T extends DouyinApiData>(
  url: string,
  body: Record<string, string>
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { data?: T; message?: string };
  const data = json.data;
  if (!data || data.error_code !== 0) {
    throw new Error(
      data?.description || json.message || '抖音开放平台接口调用失败'
    );
  }
  return data;
}

function buildDouyinAdapter(
  clientKey: string,
  clientSecret: string
): PlatformAdapter {
  return {
    buildAuthorizeUrl: ({ state, redirectUri, scopes }) => {
      const scopeStr = scopes?.length ? scopes.join(',') : 'user_info';
      return `https://open.douyin.com/platform/oauth/connect?client_key=${encodeURIComponent(clientKey)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopeStr)}&response_type=code`;
    },
    exchangeCode: async ({ code }) => {
      const data = await douyinPostJson<DouyinApiData>(
        'https://open.douyin.com/oauth/access_token/',
        {
          grant_type: 'authorization_code',
          client_key: clientKey,
          client_secret: clientSecret,
          code,
        }
      );
      return {
        accessToken: data.access_token!,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        refreshExpiresIn: data.refresh_expires_in,
        scopes: data.scope?.split(',').filter(Boolean),
        rawData: data as Record<string, unknown>,
      };
    },
    getAccountProfile: async ({ accessToken, openId }) => {
      if (!openId) {
        throw new Error('抖音用户信息缺少 open_id');
      }
      const params = new URLSearchParams({
        open_id: openId,
        access_token: accessToken,
      });
      const res = await fetch('https://open.douyin.com/oauth/userinfo/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const json = (await res.json()) as {
        err_no?: number;
        err_msg?: string;
        data?: DouyinApiData;
      };
      const data = json.data;
      if (json.err_no !== 0 || !data || data.error_code !== 0) {
        throw new Error(
          data?.description || json.err_msg || '获取抖音用户信息失败'
        );
      }
      return {
        externalAccountId: data.open_id ?? openId,
        accountName: data.nickname || `抖音用户 ${openId.slice(0, 8)}`,
        avatarUrl: data.avatar,
        rawData: data as Record<string, unknown>,
      };
    },
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

/** 仅当显式设置 USE_MOCK_OAUTH=true 时走本地 dev-authorize */
export function isMockOAuthEnabled(
  _platform: Platform,
  _dbConfig?: PlatformOAuthConfig
): boolean {
  return process.env.USE_MOCK_OAUTH === 'true';
}

/* ---- helpers ---- */

async function notImplemented(name: string): Promise<never> {
  throw new Error(`${name} 接口尚未实现，请先实现该平台的 PlatformAdapter。`);
}

async function notImplementedZhihu(): Promise<never> {
  throw new Error('知乎暂不支持官方自动同步，请使用手动导入。');
}
