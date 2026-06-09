function hasApiKey(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

/** Map seeded DeepSeek defaults to the configured Agnes model. */
export function resolveChatModel(requested: string): string {
  if (!hasApiKey('AGNES_API_KEY')) {
    return requested;
  }

  const agnesModel = process.env.AGNES_MODEL?.trim();
  if (agnesModel) return agnesModel;
  if (requested.startsWith('agnes')) return requested;
  return 'agnes-2.0-flash';
}
