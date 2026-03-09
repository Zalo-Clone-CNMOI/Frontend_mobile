/**
 * apiService.ts
 *
 * Base utility for all API calls.
 * Currently uses `mockFetch` to simulate async network requests.
 * To switch to a real backend → replace `mockFetch` with real `fetch(BASE_URL + path, ...)`.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

/** Base URL của backend thật – dùng khi chuyển sang production */
export const BASE_URL = 'http://175.41.136.189:5000/api';

/** Delay giả lập độ trễ mạng (ms) */
const DEFAULT_DELAY_MS = 300;

// ─── Mock Fetch ───────────────────────────────────────────────────────────────

/**
 * Giả lập một async HTTP GET response.
 * Trả về `data` sau một khoảng delay nhỏ để mô phỏng network latency.
 *
 * Khi có backend thật, replace function này bằng:
 * ```ts
 * export async function apiFetch<T>(path: string): Promise<T> {
 *   const token = await getCurrentToken();
 *   const res = await fetch(BASE_URL + path, {
 *     headers: { Authorization: `Bearer ${token}` },
 *   });
 *   if (!res.ok) throw new Error(`API error ${res.status}`);
 *   return res.json();
 * }
 * ```
 */
export function mockFetch<T>(data: T, delayMs: number = DEFAULT_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delayMs));
}

// ─── API Error ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
