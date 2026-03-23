import { NETWORK_CONFIG } from '../config/network';
import { saveAuthData, type UserInfo } from './authService';
import api from './http';

export const register = async (payload: any) => {
  try {
    return await api.post('/api/auth/register', payload);
  } catch (e: any) {
    console.warn('authApi.register failed:', e?.message);
    throw e;
  }
};

export const login = async (payload: any) => {
  try {
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
    console.warn('authApi.login failed:', e?.message);
    throw e;
  }
};

export const logout = async () => {
  try {
    return await api.post('/api/auth/logout');
  } catch (e: any) {
    console.warn('authApi.logout failed:', e?.message);
    throw e;
  }
};

export const resetPassword = async (payload: any) => {
  try {
    return await api.post('/api/auth/reset-password', payload);
  } catch (e: any) {
    console.warn('authApi.resetPassword failed:', e?.message);
    throw e;
  }
};

export const qrGenerate = async (payload?: any) => {
  try {
    return await api.post('/api/auth/qr/generate', payload || {});
  } catch (e: any) {
    console.warn('authApi.qrGenerate failed:', e?.message);
    throw e;
  }
};

export const qrStatus = async (qrId: string) => {
  try {
    return await api.get(`/api/auth/qr/status/${qrId}`);
  } catch (e: any) {
    console.warn('authApi.qrStatus failed:', e?.message);
    throw e;
  }
};

export const qrConfirm = async (qrId: string, payload?: any) => {
  try {
    return await api.post(`/api/auth/qr/confirm/${qrId}`, payload || {});
  } catch (e: any) {
    console.warn('authApi.qrConfirm failed:', e?.message);
    throw e;
  }
};

export const qrReject = async (qrId: string, payload?: any) => {
  try {
    return await api.post(`/api/auth/qr/reject/${qrId}`, payload || {});
  } catch (e: any) {
    console.warn('authApi.qrReject failed:', e?.message);
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
