import { NETWORK_CONFIG } from '../config/network';
import { saveAuthData, type UserInfo } from './authService';
import api from './http';

const formatPhonePayload = (payload: any) => {
  if (payload && typeof payload.phone === 'string') {
    const phoneStr = payload.phone.trim();
    if (phoneStr.startsWith('0')) {
      payload.phone = '+84' + phoneStr.slice(1);
    } else if (!phoneStr.startsWith('+')) {
      payload.phone = '+84' + phoneStr;
    }
  }
};

export const register = async (payload: any) => {
  try {
    formatPhonePayload(payload);
    return await api.post(`${NETWORK_CONFIG.AUTH_BASE_URL}/register`, payload);
  } catch (e: any) {
    throw e;
  }
};

export const login = async (payload: any) => {
  try {
    formatPhonePayload(payload);
    const response = await api.post(NETWORK_CONFIG.AUTH_LOGIN_URL, payload);

    const raw = response?.data || {};
    const data = raw?.data || raw;
    const user = data?.user || data?.profile || {};
    const tokens = data?.tokens || raw?.tokens || {};
    const accessToken = String(tokens?.accessToken || '').trim();

    if (accessToken) {
      const refreshToken = String(tokens?.refreshToken || '').trim();
      const userInfo: UserInfo = {
        phone: String(user?.phone || payload?.phone || '').trim(),
        name: user?.fullName || user?.name || '',
        email: user?.email || '',
        avatarUrl: user?.avatarUrl || user?.avatar || '',
        bio: user?.bio || '',
        dateOfBirth: user?.dateOfBirth || '',
        gender: user?.gender || '',
        id: user?.id || user?._id || '',
        status: user?.status || '',
        createdAt: user?.createdAt || '',
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: Number(tokens?.expiresIn || 0),
        },
        loginTime: Date.now(),
      };
      await saveAuthData(userInfo);
      (response as any).persistedUserInfo = userInfo;
    }

    return response;
  } catch (e: any) {
    throw e;
  }
};

export const logout = async () => {
  try {
    return await api.post(`${NETWORK_CONFIG.AUTH_BASE_URL}/logout`);
  } catch (e: any) {
    throw e;
  }
};

export const resetPassword = async (payload: any) => {
  try {
    formatPhonePayload(payload);
    return await api.post(`${NETWORK_CONFIG.AUTH_BASE_URL}/reset-password`, payload);
  } catch (e: any) {
    throw e;
  }
};

export const qrGenerate = async (payload?: any) => {
  try {
    return await api.post(`${NETWORK_CONFIG.AUTH_BASE_URL}/qr/generate`, payload || {});
  } catch (e: any) {
    throw e;
  }
};

export const qrStatus = async (qrId: string) => {
  try {
    return await api.get(`${NETWORK_CONFIG.AUTH_BASE_URL}/qr/status/${qrId}`);
  } catch (e: any) {
    throw e;
  }
};

export const qrConfirm = async (sessionId: string, payload?: any) => {
  try {
    const url = `${NETWORK_CONFIG.AUTH_BASE_URL}/qr/confirm`;
    const body = { sessionId, ...payload };
    console.log('[QR Confirm] ========== REQUEST ==========');
    console.log('[QR Confirm] URL:', url);
    console.log('[QR Confirm] Method: POST');
    console.log('[QR Confirm] Body:', JSON.stringify(body));
    return await api.post(url, body);
  } catch (e: any) {
    console.error('[QR Confirm] ========== ERROR ==========');
    console.error('[QR Confirm] Error:', e.message);
    if (e.response) {
      console.error('[QR Confirm] Response status:', e.response.status);
      console.error('[QR Confirm] Response data:', e.response.data);
    }
    throw e;
  }
};

export const qrReject = async (sessionId: string, payload?: any) => {
  try {
    const url = `${NETWORK_CONFIG.AUTH_BASE_URL}/qr/reject`;
    const body = { sessionId, ...payload };
    console.log('[QR Reject] URL:', url);
    console.log('[QR Reject] Body:', JSON.stringify(body));
    return await api.post(url, body);
  } catch (e: any) {
    console.error('[QR Reject] Error:', e.message);
    if (e.response) {
      console.error('[QR Reject] Response status:', e.response.status);
      console.error('[QR Reject] Response data:', e.response.data);
    }
    throw e;
  }
};

export default {
  login,
  logout,
  qrConfirm,
  qrGenerate,
  qrReject,
  qrStatus,
  register,
  resetPassword,
};
