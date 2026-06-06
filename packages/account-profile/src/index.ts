import { prisma, type Platform } from '@acs/db';
import { AppError, ErrorCodes, requireRoles, type AuthUser } from '@acs/core';

export * from './status.js';
export * from './oauth-state.js';
export * from './token-crypto.js';
export * from './platform-slug.js';
export * from './adapters/index.js';
export * from './binding-service.js';

export async function listAccounts(
  user: AuthUser,
  query: { platform?: string; authStatus?: string }
) {
  const where: { platform?: Platform; authStatus?: string; ownerId?: string } =
    {};
  if (query.platform) where.platform = query.platform as Platform;
  if (query.authStatus) where.authStatus = query.authStatus;
  if (user.role === 'OPERATOR') where.ownerId = user.id;
  return prisma.platformAccount.findMany({
    where,
    include: { profile: true, owner: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAccount(id: string) {
  const account = await prisma.platformAccount.findUnique({
    where: { id },
    include: { profile: true, owner: { select: { id: true, name: true, email: true } } },
  });
  if (!account)
    throw new AppError(ErrorCodes.NOT_FOUND, 'account not found', 404);
  return account;
}

export async function updateAccount(
  user: AuthUser,
  id: string,
  data: Partial<{
    platform: Platform;
    accountName: string;
    accountType: string | null;
    authStatus: string;
    ownerId: string;
    rawData: Record<string, unknown> | null;
  }>
) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  const account = await getAccount(id);
  if (user.role === 'OPERATOR' && account.ownerId !== user.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }
  if (user.role !== 'ADMIN' && data.ownerId) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }
  return prisma.platformAccount.update({
    where: { id },
    data: {
      ...data,
      rawData: data.rawData as object | undefined,
    },
    include: { profile: true, owner: { select: { id: true, name: true, email: true } } },
  });
}

export async function upsertProfile(
  user: AuthUser,
  accountId: string,
  data: {
    positioning?: string;
    targetAudience?: Record<string, unknown>;
    contentStyle?: string;
    titlePreference?: string;
    coverPreference?: string;
    tone?: string;
    contentBoundary?: string;
    publishStrategy?: string;
    forbiddenWords?: string[];
  }
) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  const account = await getAccount(accountId);
  if (user.role === 'OPERATOR' && account.ownerId !== user.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }
  return prisma.accountProfile.upsert({
    where: { accountId },
    create: {
      accountId,
      ...data,
      targetAudience: data.targetAudience as object | undefined,
      forbiddenWords: data.forbiddenWords ?? [],
    },
    update: {
      ...data,
      targetAudience: data.targetAudience as object | undefined,
      forbiddenWords: data.forbiddenWords ?? [],
    },
  });
}

export async function getProfileByAccountId(accountId: string) {
  return prisma.accountProfile.findUnique({ where: { accountId } });
}
