const TOKEN_KEY = 'acs_token';
const UNAUTHORIZED_CODE = 40100;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isUnauthorizedError(code: number, message?: string) {
  return code === UNAUTHORIZED_CODE || message === 'unauthorized';
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path === '/login' || path.startsWith('/login/')) return;
  clearToken();
  const next = encodeURIComponent(path + window.location.search);
  window.location.replace(`/login?next=${next}`);
}

/** Never resolves — used while redirecting to login so callers don't surface errors. */
function pendingRedirect(): Promise<never> {
  return new Promise(() => {});
}

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ code: number; message: string; data: T }> {
  const isLoginRequest = path.includes('/auth/login');

  if (!isLoginRequest && !getToken()) {
    redirectToLogin();
    return pendingRedirect();
  }

  const hasBody = !!options.body;
  const headers: Record<string, string> = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    redirectToLogin();
    return pendingRedirect();
  }

  let json: { code: number; message: string; data: T };
  try {
    json = await res.json();
  } catch {
    const text = await res.text().catch(() => '(unable to read response)');
    console.error('[API Response Error]', {
      status: res.status,
      statusText: res.statusText,
      url: path,
      headers: Object.fromEntries(res.headers.entries()),
      bodyPreview: text.slice(0, 500),
    });
    throw new ApiError(
      res.status === 401 ? UNAUTHORIZED_CODE : 50000,
      `HTTP ${res.status}: ${res.statusText}`
    );
  }

  if (json.code !== 0) {
    const sessionRejected =
      !isLoginRequest &&
      json.code === UNAUTHORIZED_CODE &&
      json.message === 'unauthorized';

    if (sessionRejected) {
      redirectToLogin();
      return pendingRedirect();
    }

    throw new ApiError(json.code, json.message || 'request failed');
  }
  return json;
}
