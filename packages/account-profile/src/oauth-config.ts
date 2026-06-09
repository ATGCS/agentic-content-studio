import { prisma } from '@acs/db';

export const OAUTH_CONFIG_KEY = 'platform.oauth';

export type PlatformOAuthConfig = {
  wechat?: { appId: string; appSecret: string };
  douyin?: { clientKey: string; clientSecret: string };
  kuaishou?: { appId: string; appSecret: string };
  bilibili?: { appId: string; appSecret: string };
};

export async function getOAuthConfig(): Promise<PlatformOAuthConfig> {
  const row = await prisma.systemConfig.findUnique({
    where: { key: OAUTH_CONFIG_KEY },
  });
  return (row?.value ?? {}) as PlatformOAuthConfig;
}

export async function saveOAuthConfig(
  input: Partial<PlatformOAuthConfig>
): Promise<PlatformOAuthConfig> {
  const current = await getOAuthConfig();
  const next: PlatformOAuthConfig = {
    ...current,
    ...input,
    wechat: input.wechat ?? current.wechat,
    douyin: input.douyin ?? current.douyin,
    kuaishou: input.kuaishou ?? current.kuaishou,
    bilibili: input.bilibili ?? current.bilibili,
  };

  await prisma.systemConfig.upsert({
    where: { key: OAUTH_CONFIG_KEY },
    update: {
      value: next as object,
      description: 'Platform OAuth credentials',
    },
    create: {
      key: OAUTH_CONFIG_KEY,
      value: next as object,
      description: 'Platform OAuth credentials',
    },
  });

  return next;
}

export function maskSecret(val: string): string {
  if (!val) return '';
  if (val.length <= 4) return '****';
  return `${'*'.repeat(8)}${val.slice(-4)}`;
}

export function publicOAuthConfig(config: PlatformOAuthConfig) {
  const out: Record<string, { configured: boolean; appId?: string }> = {};
  for (const [platform, cfg] of Object.entries(config)) {
    if (cfg && typeof cfg === 'object') {
      const c = cfg as Record<string, string>;
      const appId = c.appId || c.clientKey || '';
      out[platform] = {
        configured:
          Boolean(c.appId || c.clientKey) &&
          Boolean(c.appSecret || c.clientSecret),
        appId: appId ? maskSecret(appId) : undefined,
      };
    }
  }
  return out;
}
