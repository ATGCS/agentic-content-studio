/** Normalize authorization URL for local dev (Next proxy on :3001). */
export function resolveAuthorizationUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/api/')) return url;

  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === 'localhost' &&
      (parsed.port === '3000' || parsed.port === '3002' || parsed.port === '3001')
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }
    if (parsed.pathname.includes('/dev-authorize')) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return url;
  }
  return url;
}

export function navigateToAuthorization(url: string) {
  window.location.href = resolveAuthorizationUrl(url);
}
