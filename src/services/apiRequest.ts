import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const buildUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${NETWORK_CONFIG.API_BASE_URL}${normalized}`;
};

const parseResponseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const apiJsonRequest = async <T = unknown>(
  method: HttpMethod,
  path: string,
  options?: {
    body?: unknown;
    timeoutMs?: number;
    headers?: Record<string, string>;
  },
): Promise<{ data: T; status: number; raw: unknown }> => {
  const url = buildUrl(path);
  const body =
    options?.body !== undefined ? JSON.stringify(options.body) : undefined;

  const response = await apiCallWithRefresh(
    url,
    {
      method,
      body,
      headers: options?.headers,
    },
    options?.timeoutMs ?? NETWORK_CONFIG.HTTP_TIMEOUT_MS,
  );

  const raw = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      (raw as any)?.message ||
      (raw as any)?.error ||
      `Request failed (${response.status})`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  const data = ((raw as any)?.data ?? raw) as T;
  return { data, status: response.status, raw };
};
