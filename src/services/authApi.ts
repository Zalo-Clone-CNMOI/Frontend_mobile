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

const toE164Phone = (phone: string): string => {
  const phoneStr = String(phone || '').trim();
  if (!phoneStr) return '';
  if (phoneStr.startsWith('+')) return phoneStr;
  if (phoneStr.startsWith('0')) return `+84${phoneStr.slice(1)}`;
  return `+84${phoneStr}`;
};

const parsePhoneExistsResponse = (raw: any): boolean | null => {
  const payload = raw?.data ?? raw;

  const deep = (obj: any, path: string[]): any => {
    let cur = obj;
    for (const key of path) {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = cur[key];
    }
    return cur;
  };

  const asBool = (v: any): boolean | undefined => (typeof v === 'boolean' ? v : undefined);

  const containsAny = (text: string, tokens: string[]) => {
    const t = text.toLowerCase();
    return tokens.some((x) => t.includes(x));
  };

  // Direct boolean payloads
  if (typeof payload === 'boolean') return payload;

  // Common shapes: { exists: true } / { data: { exists: true } } / etc.
  const candidates = [
    payload?.exists,
    payload?.isRegistered,
    payload?.registered,
    deep(payload, ['data', 'exists']),
    deep(payload, ['data', 'isRegistered']),
    deep(payload, ['data', 'registered']),
    deep(payload, ['result', 'exists']),
    deep(payload, ['result', 'registered']),
    deep(payload, ['meta', 'exists']),
  ];
  for (const c of candidates) {
    const b = asBool(c);
    if (b !== undefined) return b;
  }

  // Some APIs return a user/account object when registered
  if (payload?.user || payload?.account || deep(payload, ['data', 'user']) || deep(payload, ['data', 'account'])) {
    return true;
  }

  // Error shapes: { success:false, error:{ code, message, details } }
  const errorCode = String(deep(payload, ['error', 'code']) || payload?.code || '').toLowerCase();
  const errorMsg = String(deep(payload, ['error', 'message']) || payload?.message || payload?.error || '').toLowerCase();
  const details = deep(payload, ['error', 'details']) || payload?.details;
  const detailsText = Array.isArray(details) ? JSON.stringify(details).toLowerCase() : String(details || '').toLowerCase();

  if (
    containsAny(errorCode, ['exists', 'registered', 'already', 'duplicate', 'conflict']) ||
    containsAny(errorMsg, ['exists', 'registered', 'already', 'duplicate', 'conflict', 'đã được', 'đã tồn tại']) ||
    containsAny(detailsText, ['exists', 'registered', 'already', 'duplicate', 'conflict', 'đã được', 'đã tồn tại'])
  ) {
    return true;
  }

  return null;
};

export const checkPhoneExists = async (phone: string): Promise<boolean | null> => {
  const normalizedPhone = toE164Phone(phone);
  if (!normalizedPhone) return null;

  const candidateEndpoints = [
    `${NETWORK_CONFIG.AUTH_BASE_URL}/check-phone`,
    `${NETWORK_CONFIG.AUTH_BASE_URL}/phone-exists`,
    `${NETWORK_CONFIG.AUTH_BASE_URL}/exists`,
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await api.get(endpoint, { params: { phone: normalizedPhone } });
      const parsed = parsePhoneExistsResponse(response?.data);
      if (parsed !== null) return parsed;
    } catch (e: any) {
      const status = Number(e?.response?.status || 0);
      const data = e?.response?.data;

      if (status === 404 || status === 405) {
        continue;
      }

      if (status === 409) {
        return true;
      }

      // Some backends use 400/422 with a validation payload indicating the phone already exists.
      if (status === 400 || status === 422) {
        const parsed = parsePhoneExistsResponse(data);
        if (parsed !== null) return parsed;
      }

      throw e;
    }
  }

  return null;
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
  checkPhoneExists,
  login,
  logout,
  qrConfirm,
  qrGenerate,
  qrReject,
  qrStatus,
  register,
  resetPassword,
};
