import { DISTILL_API_URL } from './config';
import { getToken, clearToken } from './secure-store';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchOpts = Omit<RequestInit, 'body'> & {
  body?: unknown;
  // Skip the bearer token (only used by /api/auth/login itself).
  skipAuth?: boolean;
};

export async function api<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = `${DISTILL_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (opts.body !== undefined && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }
  if (!opts.skipAuth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    body = opts.body instanceof FormData
      ? (opts.body as FormData)
      : JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    ...opts,
    headers,
    body,
  });

  if (res.status === 401) {
    await clearToken();
    throw new ApiError(401, 'Not authenticated');
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* keep generic */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
