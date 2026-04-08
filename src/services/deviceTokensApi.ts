import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';

export async function registerDeviceToken(payload: {
  token: string;
  platform: 'android' | 'ios';
}) {
  // Backend (per Swagger): POST /api/device-tokens (auth required)
  const candidates = [
    `${NETWORK_CONFIG.API_BASE_URL}/device-tokens`, // e.g. http://host:5000/api/device-tokens
  ];

  let lastError: any;
  for (const url of candidates) {
    try {
      // Use shared refresh-on-401 wrapper to avoid "session expired" failures.
      const resp = await apiCallWithRefresh(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        const err: any = new Error(`Device token register failed: HTTP ${resp.status}`);
        err.status = resp.status;
        err.url = url;
        err.body = text;
        throw err;
      }

      // Return a small axios-like shape for existing call sites
      const data = await resp.json().catch(() => ({}));
      return { data, status: resp.status, url };
    } catch (e: any) {
      lastError = e;
      const status = e?.response?.status ?? e?.status;
      // Only fall back on Not Found; otherwise surface the real failure.
      if (status !== 404) throw e;
    }
  }

  throw lastError;
}

