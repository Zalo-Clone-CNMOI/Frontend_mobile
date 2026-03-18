/**
 * apiService.ts
 *
 * Base utility for all API calls.
 * Currently uses `mockFetch` to simulate async network requests.
 * To switch to a real backend → replace `mockFetch` with real `fetch(BASE_URL + path, ...)`.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

/** Base URL của backend thật – dùng khi chuyển sang production */
import { getCurrentToken } from './authService';

export const BASE_URL = "http://175.41.136.189:5000/api";

// Simple fetch wrapper that attaches stored access token and returns parsed JSON.
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getCurrentToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE_URL + path, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || `API error ${res.status}`);
  }
  return res.json();
}

// ─── API Error ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
