/**
 * apiService.ts
 *
 * Base utility for all API calls.
 * Currently uses `mockFetch` to simulate async network requests.
 * To switch to a real backend → replace `mockFetch` with real `fetch(BASE_URL + path, ...)`.
 */


/** Base URL của backend thật – dùng khi chuyển sang production */
import { getCurrentToken } from './authService';
import { NETWORK_CONFIG } from '../config/network';

export const BASE_URL = NETWORK_CONFIG.API_BASE_URL;

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


export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
