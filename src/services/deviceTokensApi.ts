import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';
import api from "./http";

export async function registerDeviceToken(payload: {
  token: string;
  platform: 'android' | 'ios';
}) {
  const candidates = [
    `${NETWORK_CONFIG.API_BASE_URL}/device-tokens`, // e.g. http://host:5000/api/device-tokens
  ];

  let lastError: any;
  for (const url of candidates) {
    try {
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

      const data = await resp.json().catch(() => ({}));
      return { data, status: resp.status, url };
    } catch (e: any) {
      lastError = e;
      const status = e?.response?.status ?? e?.status;
      if (status !== 404) throw e;
    }
  }
throw lastError;
}

export const deleteDeviceToken = async (tokenId: string) => {
  try {
    const response = await api.delete(`${NETWORK_CONFIG.API_BASE_URL}/device-tokens/${encodeURIComponent(tokenId)}`);
    return response;
  } catch (e: any) {
    throw e;
  }
};

export default {
  registerDeviceToken,
  deleteDeviceToken,
};
