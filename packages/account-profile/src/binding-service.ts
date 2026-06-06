import { prisma, type Platform, Prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { encryptToken, decryptToken } from './token-crypto.js';
import { oauthPublicBase, platformToSlug } from './platform-slug.js';
import { consumeOAuthState } from './oauth-state.js';
import { getAdapter } from './adapters/index.js';
import { AccountAuthStatus, canTransition } from './status.js';

function toJsonInput(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonObject);
}

export async function startBind(input: {
  platform: Platform;
  ownerId: string;
  redirectAfterBind?: string;
  scopes?: string[];
  accountId?: string;
}) {
  const adapter = getAdapter(input.platform);
  const { state, expiresAt } = await (async () => {
    const { createOAuthState } = await import('./oauth-state.js');
    return createOAuthState({
      platform: input.platform,
      ownerId: input.ownerId,
      accountId: input.accountId,
      redirectAfterBind: input.redirectAfterBind,
      scopes: input.scopes,
    });
  })();

  const callbackBase = oauthPublicBase();
  const redirectUri = `${callbackBase}/api/oauth/${platformToSlug(input.platform)}/callback`;

  const authorizationUrl = adapter.buildAuthorizeUrl({
    state,
    redirectUri,
    scopes: input.scopes,
  });

  if (input.accountId) {
    const account = await prisma.platformAccount.findUnique({ where: { id: input.accountId } });
    if (!account) throw new AppError(ErrorCodes.NOT_FOUND, 'account not found', 404);
    if (!canTransition(account.authStatus, AccountAuthStatus.AUTHORIZING)) {
      throw new AppError(ErrorCodes.BAD_REQUEST, `cannot transition from ${account.authStatus} to authorizing`, 400);
    }
    await prisma.platformAccount.update({
      where: { id: input.accountId },
      data: { authStatus: AccountAuthStatus.AUTHORIZING },
    });
  }

  return { authorizationUrl, state, expiresAt };
}

export async function completeOAuthCallback(input: {
  platform: Platform;
  code: string;
  state: string;
  redirectUri: string;
}) {
  const stateRecord = await consumeOAuthState(input.state);
  const adapter = getAdapter(input.platform);

  const tokenResult = await adapter.exchangeCode({
    code: input.code,
    redirectUri: input.redirectUri,
  });

  const profile = await adapter.getAccountProfile({
    accessToken: tokenResult.accessToken,
  });

  let account = await prisma.platformAccount.findFirst({
    where: {
      platform: input.platform,
      externalAccountId: profile.externalAccountId,
    },
  });

  const now = new Date();

  if (!account) {
    account = await prisma.platformAccount.create({
      data: {
        platform: input.platform,
        accountName: profile.accountName,
        externalAccountId: profile.externalAccountId,
        avatarUrl: profile.avatarUrl,
        authStatus: AccountAuthStatus.ACTIVE,
        ownerId: stateRecord.ownerId,
        boundAt: now,
        scopes: tokenResult.scopes,
        rawData: toJsonInput(profile.rawData),
      },
    });
  } else {
    account = await prisma.platformAccount.update({
      where: { id: account.id },
      data: {
        accountName: profile.accountName,
        avatarUrl: profile.avatarUrl,
        authStatus: AccountAuthStatus.ACTIVE,
        boundAt: now,
        scopes: tokenResult.scopes,
        revokedAt: null,
        lastError: null,
        rawData: toJsonInput(profile.rawData),
      },
    });
  }

  const existingToken = await prisma.socialAccountToken.findUnique({
    where: { accountId: account.id },
  });

  const encryptedAccess = encryptToken(tokenResult.accessToken);
  const encryptedRefresh = tokenResult.refreshToken ? encryptToken(tokenResult.refreshToken) : null;

  if (!existingToken) {
    await prisma.socialAccountToken.create({
      data: {
        accountId: account.id,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: tokenResult.expiresIn ? new Date(Date.now() + tokenResult.expiresIn * 1000) : null,
        refreshExpiresAt: tokenResult.refreshExpiresIn ? new Date(Date.now() + tokenResult.refreshExpiresIn * 1000) : null,
        scopes: tokenResult.scopes,
        rawData: toJsonInput(tokenResult.rawData),
      },
    });
  } else {
    await prisma.socialAccountToken.update({
      where: { id: existingToken.id },
      data: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: tokenResult.expiresIn ? new Date(Date.now() + tokenResult.expiresIn * 1000) : null,
        refreshExpiresAt: tokenResult.refreshExpiresIn ? new Date(Date.now() + tokenResult.refreshExpiresIn * 1000) : null,
        scopes: tokenResult.scopes,
        rawData: toJsonInput(tokenResult.rawData),
      },
    });
  }

  return account;
}

export async function devAuthorize(input: {
  platform: Platform;
  state: string;
  accountId?: string;
}) {
  const stateRecord = await consumeOAuthState(input.state);
  if (stateRecord.platform !== input.platform) {
    throw new AppError(ErrorCodes.BAD_REQUEST, 'oauth state platform mismatch', 400);
  }

  const profile = {
    externalAccountId: `dev_ext_${Date.now()}`,
    accountName: `Dev ${input.platform} Account`,
    avatarUrl: undefined as string | undefined,
  };

  const tokenResult = {
    accessToken: `dev_at_${Date.now()}`,
    refreshToken: `dev_rt_${Date.now()}`,
    expiresIn: 7200,
    refreshExpiresIn: 30 * 24 * 3600,
    scopes: ['dev'],
  };

  let account = input.accountId
    ? await prisma.platformAccount.findUnique({ where: { id: input.accountId } })
    : null;

  const now = new Date();

  if (!account) {
    account = await prisma.platformAccount.create({
      data: {
        platform: input.platform,
        accountName: profile.accountName,
        externalAccountId: profile.externalAccountId,
        avatarUrl: profile.avatarUrl,
        authStatus: AccountAuthStatus.ACTIVE,
        ownerId: stateRecord.ownerId,
        boundAt: now,
        scopes: tokenResult.scopes,
      },
    });
  } else {
    account = await prisma.platformAccount.update({
      where: { id: account.id },
      data: {
        accountName: profile.accountName,
        avatarUrl: profile.avatarUrl,
        authStatus: AccountAuthStatus.ACTIVE,
        boundAt: now,
        scopes: tokenResult.scopes,
        revokedAt: null,
        lastError: null,
      },
    });
  }

  const encryptedAccess = encryptToken(tokenResult.accessToken);
  const encryptedRefresh = encryptToken(tokenResult.refreshToken);

  const existingToken = await prisma.socialAccountToken.findUnique({
    where: { accountId: account.id },
  });

  if (!existingToken) {
    await prisma.socialAccountToken.create({
      data: {
        accountId: account.id,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: new Date(Date.now() + tokenResult.expiresIn * 1000),
        refreshExpiresAt: new Date(Date.now() + tokenResult.refreshExpiresIn * 1000),
        scopes: tokenResult.scopes,
      },
    });
  } else {
    await prisma.socialAccountToken.update({
      where: { id: existingToken.id },
      data: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: new Date(Date.now() + tokenResult.expiresIn * 1000),
        refreshExpiresAt: new Date(Date.now() + tokenResult.refreshExpiresIn * 1000),
        scopes: tokenResult.scopes,
      },
    });
  }

  return account;
}

export async function revokeAccount(accountId: string) {
  const account = await prisma.platformAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new AppError(ErrorCodes.NOT_FOUND, 'account not found', 404);
  if (!canTransition(account.authStatus, AccountAuthStatus.REVOKED)) {
    throw new AppError(ErrorCodes.BAD_REQUEST, `cannot revoke from ${account.authStatus}`, 400);
  }

  await prisma.socialAccountToken.deleteMany({ where: { accountId } });
  return prisma.platformAccount.update({
    where: { id: accountId },
    data: {
      authStatus: AccountAuthStatus.REVOKED,
      revokedAt: new Date(),
    },
  });
}

export async function syncWorks(accountId: string) {
  const account = await prisma.platformAccount.findUnique({
    where: { id: accountId },
    include: { token: true },
  });
  if (!account) throw new AppError(ErrorCodes.NOT_FOUND, 'account not found', 404);
  if (!account.token) throw new AppError(ErrorCodes.UNAUTHORIZED, 'account not bound', 401);

  const adapter = getAdapter(account.platform);
  if (!adapter.syncWorks) throw new AppError(ErrorCodes.BAD_REQUEST, 'platform does not support syncWorks', 400);

  const accessToken = decryptToken(account.token.accessToken);

  const works = await adapter.syncWorks({
    accountId: account.id,
    accessToken,
  });

  const results = [];
  for (const work of works) {
    const existing = await prisma.socialContentWork.findFirst({
      where: {
        accountId: account.id,
        platform: account.platform,
        platformWorkId: work.platformWorkId,
      },
    });

    let record;
    if (!existing) {
      record = await prisma.socialContentWork.create({
        data: {
          accountId: account.id,
          platform: account.platform,
          platformWorkId: work.platformWorkId,
          title: work.title,
          url: work.url,
          publishedAt: work.publishedAt,
          rawData: toJsonInput(work.rawData),
        },
      });
    } else {
      record = await prisma.socialContentWork.update({
        where: { id: existing.id },
        data: {
          title: work.title,
          url: work.url,
          publishedAt: work.publishedAt,
          rawData: toJsonInput(work.rawData),
          updatedAt: new Date(),
        },
      });
    }
    results.push(record);
  }

  await prisma.platformAccount.update({
    where: { id: accountId },
    data: { lastSyncAt: new Date() },
  });

  return results;
}

export async function syncMetricsForAccount(accountId: string, workIds?: string[]) {
  const account = await prisma.platformAccount.findUnique({
    where: { id: accountId },
    include: { token: true },
  });
  if (!account) throw new AppError(ErrorCodes.NOT_FOUND, 'account not found', 404);
  if (!account.token) throw new AppError(ErrorCodes.UNAUTHORIZED, 'account not bound', 401);

  const adapter = getAdapter(account.platform);
  if (!adapter.syncMetrics) throw new AppError(ErrorCodes.BAD_REQUEST, 'platform does not support syncMetrics', 400);

  const accessToken = decryptToken(account.token.accessToken);

  const works = await prisma.socialContentWork.findMany({
    where: {
      accountId: account.id,
      ...(workIds && workIds.length > 0 ? { id: { in: workIds } } : {}),
    },
  });

  let snapshotCount = 0;
  for (const work of works) {
    try {
      const metrics = await adapter.syncMetrics({
        platformWorkId: work.platformWorkId,
        accessToken,
      });

      await prisma.socialMetricSnapshot.create({
        data: {
          accountId: account.id,
          workId: work.id,
          platform: account.platform,
          metrics: metrics as Prisma.InputJsonValue,
          collectedAt: new Date(),
        },
      });
      snapshotCount++;
    } catch {
      // 单作品指标失败不阻断其他作品
    }
  }

  return { snapshotCount, totalWorks: works.length };
}
