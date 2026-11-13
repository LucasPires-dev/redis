// Thin fetch wrapper for the real backend (redis-api). Tokens live in localStorage —
// the backend only understands `Authorization: Bearer <token>`, no cookie/session support.
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "redis-auth-v1";

// Same host/port as the REST API, just ws(s):// instead of http(s):// — Daphne
// serves both HTTP and WebSocket from the same ASGI process.
export function wsUrl(path: string): string {
  return `${BASE_URL.replace(/^http/, "ws")}${path}`;
}

interface Tokens {
  access: string;
  refresh: string;
}

function hasWindow() {
  return typeof window !== "undefined";
}

export function getTokens(): Tokens | null {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function setTokens(tokens: Tokens) {
  if (!hasWindow()) return;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  if (!hasWindow()) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function hasAccessToken() {
  return getTokens()?.access != null;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : `Erro ${status} na API`);
    this.status = status;
    this.detail = detail;
  }
}

// Thrown when the session is unrecoverable (no/expired token, refresh failed) — the
// caller is expected to redirect to /login.
export class AuthError extends ApiError {}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens?.refresh) return null;
  const res = await fetch(`${BASE_URL}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access: string };
  setTokens({ access: data.access, refresh: tokens.refresh });
  return data.access;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const tokens = getTokens();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (tokens?.access) headers.set("Authorization", `Bearer ${tokens.access}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !_isRetry) {
    const newAccess = await refreshAccessToken();
    if (newAccess) return apiFetch<T>(path, options, true);
    clearTokens();
    throw new AuthError(401, "Sessão expirada. Faça login novamente.");
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

/** Downloads a file the API serves (needs the auth header, so no plain link). */
export async function apiDownload(path: string, filename: string, _isRetry = false): Promise<void> {
  const tokens = getTokens();
  const headers = new Headers();
  if (tokens?.access) headers.set("Authorization", `Bearer ${tokens.access}`);
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (res.status === 401 && !_isRetry) {
    const newAccess = await refreshAccessToken();
    if (newAccess) return apiDownload(path, filename, true);
    clearTokens();
    throw new AuthError(401, "Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) {
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // not JSON: keep the text
    }
    throw new ApiError(res.status, body);
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Our datasets are tiny for now — fetch page 1 and return the array. Revisit if a
// list ever needs page 2 (DRF default page size is 25).
export async function apiList<T>(path: string): Promise<T[]> {
  const page = await apiFetch<Paginated<T>>(path);
  return page.results;
}

// One readable line out of an API error — DRF validation bodies look like
// {"field": ["message"]}, {"detail": "message"} or, for nested serializers,
// {"ticket": {"price_cents": ["message"]}}.
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return firstMessage(error.detail) ?? fallback;
  return fallback;
}

function firstMessage(detail: unknown): string | undefined {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return firstMessage(detail[0]);
  if (detail && typeof detail === "object") {
    for (const value of Object.values(detail as Record<string, unknown>)) {
      const text = firstMessage(value);
      if (text) return text;
    }
  }
  return undefined;
}
