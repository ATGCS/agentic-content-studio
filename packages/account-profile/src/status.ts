export const AccountAuthStatus = {
  CREATED: 'created',
  AUTHORIZING: 'authorizing',
  ACTIVE: 'active',
  TOKEN_EXPIRED: 'token_expired',
  NEED_REAUTH: 'need_reauth',
  REVOKED: 'revoked',
  ERROR: 'error',
} as const;

export type AccountAuthStatus = (typeof AccountAuthStatus)[keyof typeof AccountAuthStatus];

const validTransitions: Record<string, string[]> = {
  [AccountAuthStatus.CREATED]: [AccountAuthStatus.AUTHORIZING],
  [AccountAuthStatus.AUTHORIZING]: [AccountAuthStatus.ACTIVE, AccountAuthStatus.ERROR],
  [AccountAuthStatus.ACTIVE]: [AccountAuthStatus.TOKEN_EXPIRED, AccountAuthStatus.NEED_REAUTH, AccountAuthStatus.REVOKED, AccountAuthStatus.ERROR],
  [AccountAuthStatus.TOKEN_EXPIRED]: [AccountAuthStatus.AUTHORIZING, AccountAuthStatus.REVOKED],
  [AccountAuthStatus.NEED_REAUTH]: [AccountAuthStatus.AUTHORIZING, AccountAuthStatus.REVOKED],
  [AccountAuthStatus.REVOKED]: [AccountAuthStatus.AUTHORIZING],
  [AccountAuthStatus.ERROR]: [AccountAuthStatus.AUTHORIZING, AccountAuthStatus.REVOKED],
};

export function canTransition(from: string, to: string): boolean {
  return (validTransitions[from] ?? []).includes(to);
}
