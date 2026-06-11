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

  let body = options.body;
  if (
    body != null &&
    typeof body === 'object' &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    typeof (body as ReadableStream).getReader !== 'function'
  ) {
    body = JSON.stringify(body);
  }

  const hasBody = body != null && body !== '';
  const headers: Record<string, string> = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, body, headers });

  const text = await res.text();
  let json: { code: number; message: string; data: T };
  try {
    json = JSON.parse(text);
  } catch {
    const preview = text.slice(0, 500) || '(empty body)';
    console.error(
      `[API Response Error] ${path} HTTP ${res.status} ${res.statusText}`,
      preview
    );
    throw new ApiError(
      res.status === 401 ? UNAUTHORIZED_CODE : 50000,
      preview === '(empty body)'
        ? `HTTP ${res.status}: ${res.statusText || '服务器无响应内容，可能超时或进程崩溃'}`
        : `HTTP ${res.status}: ${res.statusText}`
    );
  }

  if (json.code !== 0) {
    const sessionRejected =
      !isLoginRequest &&
      (json.code === UNAUTHORIZED_CODE ||
        (res.status === 401 && json.message === 'unauthorized'));

    if (sessionRejected) {
      redirectToLogin();
      return pendingRedirect();
    }

    throw new ApiError(json.code, json.message || 'request failed');
  }
  return json;
}
