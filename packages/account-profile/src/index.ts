import { prisma, type Platform } from '@acs/db';
import { AppError, ErrorCodes, type AuthUser } from '@acs/core';

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
    include: { profile: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAccount(id: string) {
  const account = await prisma.platformAccount.findUnique({
    where: { id },
    include: { profile: true },
  });
  if (!account)
    throw new AppError(ErrorCodes.NOT_FOUND, 'account not found', 404);
  return account;
}

export async function upsertProfile(
  accountId: string,
  data: {
    positioning?: string;
    contentStyle?: string;
    titlePreference?: string;
    tone?: string;
    contentBoundary?: string;
    publishStrategy?: string;
    forbiddenWords?: string[];
  }
) {
  await getAccount(accountId);
  return prisma.accountProfile.upsert({
    where: { accountId },
    create: { accountId, ...data, forbiddenWords: data.forbiddenWords ?? [] },
    update: { ...data, forbiddenWords: data.forbiddenWords ?? [] },
  });
}

export async function getProfileByAccountId(accountId: string) {
  return prisma.accountProfile.findUnique({ where: { accountId } });
}
