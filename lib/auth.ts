export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_KEY = 'access-token';
const REFRESH_KEY = 'refresh-token';

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
}

export function saveTokens(tokens: AuthTokens) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAuthHeaders(init?: HeadersInit): HeadersInit {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (init) {
    const initHeaders = typeof init === 'object' ? init : {};
    return { ...initHeaders as Record<string, string>, ...headers };
  }
  return headers;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await fetch(`${getBaseUrl()}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    let text = await res.text();
    // Try to parse as JSON if possible
    try {
      const jsonError = JSON.parse(text);
      text = jsonError.message || jsonError.error || text;
    } catch {
      // Keep original text if not JSON
    }
    // Normalize error message
    if (res.status === 403 || text.includes('email_not_allowed') || text.includes('email not found')) {
      throw new Error('email_not_allowed');
    }
    throw new Error(text || res.statusText);
  }
  const data = await res.json();
  const tokens: AuthTokens = {
    accessToken: data['access-token'],
    refreshToken: data['refresh-token'],
  };
  saveTokens(tokens);
  return tokens;
}

export async function register(name: string, email: string, password: string): Promise<AuthTokens> {
  const res = await fetch(`${getBaseUrl()}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    let text = await res.text();
    // Try to parse as JSON if possible
    try {
      const jsonError = JSON.parse(text);
      text = jsonError.message || jsonError.error || text;
    } catch {
      // Keep original text if not JSON
    }
    // Normalize error message
    if (res.status === 403 || text.includes('email_not_allowed') || text.includes('email not found')) {
      throw new Error('email_not_allowed');
    }
    throw new Error(text || res.statusText);
  }
  const data = await res.json();
  const tokens: AuthTokens = {
    accessToken: data['access-token'],
    refreshToken: data['refresh-token'],
  };
  saveTokens(tokens);
  return tokens;
}

export function getGoogleLoginUrl(): string {
  return `${getBaseUrl()}/oauth/google/login`;
}

export function logout() {
  clearTokens();
}

export async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearTokens();
    return false;
  }
  try {
    // Use native fetch to avoid recursion through authFetch
    const nativeFetch = (globalThis as any).fetch;
    const res = await nativeFetch(`${getBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = await res.json();
    const access = data['access-token'];
    if (!access) {
      clearTokens();
      return false;
    }
    saveTokens({ accessToken: access, refreshToken: refresh });
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export function getCurrentUser(): { id?: string; email?: string; name?: string } | null {
  const token = getAccessToken();
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const email = payload.email || payload.Email || payload.sub || undefined;
    const name = payload.name || payload.Name || undefined;
    const userid = payload.id || payload.ID || payload.user_id || payload.UserID || undefined;
    return { id: userid, email, name };
  } catch {
    return null;
  }
}
