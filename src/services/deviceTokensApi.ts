<<<<<<< HEAD
import { apiCallWithRefresh } from "./authService";
import api from "./http";
=======
import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';
>>>>>>> 0574c9bf85f4d736a36d11560f37540f4c8b10c4

export async function registerDeviceToken(payload: {
  token: string;
  platform: 'android' | 'ios';
}) {
<<<<<<< HEAD
  // Backend: POST /api/device-tokens (auth required)
  const candidates = [
    'http://54.179.206.215:5000/api/device-tokens',
=======
  // Backend (per Swagger): POST /api/device-tokens (auth required)
  const candidates = [
    `${NETWORK_CONFIG.API_BASE_URL}/device-tokens`, // e.g. http://host:5000/api/device-tokens
>>>>>>> 0574c9bf85f4d736a36d11560f37540f4c8b10c4
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
<<<<<<< HEAD

  throw lastError;
}

export const deleteDeviceToken = async (tokenId: string) => {
  try {
    console.log('Deleting device token:', tokenId);
    const response = await api.delete(`http://54.179.206.215:5000/api/device-tokens/${encodeURIComponent(tokenId)}`);
    console.log('Device token deletion successful');
    return response;
  } catch (e: any) {
    console.error('Device token deletion failed:', e.message);
    throw e;
  }
};

export default {
  registerDeviceToken,
  deleteDeviceToken,
};
=======

  throw lastError;
}

>>>>>>> 0574c9bf85f4d736a36d11560f37540f4c8b10c4
