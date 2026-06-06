import { prisma, type Platform } from '@acs/db';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function randomState(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createOAuthState(input: {
  platform: Platform;
  ownerId: string;
  accountId?: string;
  redirectAfterBind?: string;
  scopes?: string[];
}) {
  const state = randomState();
  const expiresAt = new Date(Date.now() + STATE_TTL_MS);
  await prisma.socialOAuthState.create({
    data: {
      state,
      platform: input.platform,
      ownerId: input.ownerId,
      accountId: input.accountId,
      redirectAfterBind: input.redirectAfterBind,
      scopes: input.scopes,
      expiresAt,
    },
  });
  return { state, expiresAt };
}

export async function consumeOAuthState(state: string) {
  const record = await prisma.socialOAuthState.findUnique({ where: { state } });
  if (!record) throw new Error('invalid oauth state');
  if (record.consumedAt) throw new Error('oauth state already consumed');
  if (record.expiresAt.getTime() < Date.now()) throw new Error('oauth state expired');

  await prisma.socialOAuthState.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
  return record;
}
