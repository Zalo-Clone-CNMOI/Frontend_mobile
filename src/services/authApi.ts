import { NETWORK_CONFIG } from '../config/network';
import { saveAuthData, type UserInfo } from './authService';
import api from './http';

// Format phone number to E.164 format (+84) in payload
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

// Convert phone number to E.164 format (+84)
const toE164Phone = (phone: string): string => {
  const phoneStr = String(phone || '').trim();
  if (!phoneStr) return '';
  if (phoneStr.startsWith('+')) return phoneStr;
  if (phoneStr.startsWith('0')) return `+84${phoneStr.slice(1)}`;
  return `+84${phoneStr}`;
};

// Parse phone exists check response from various API formats
// Handles direct boolean, nested objects, error codes, and Vietnamese messages
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

// Check if phone number is already registered
// Tries multiple endpoints, handles various response formats
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

// Register new user account
// Formats phone to E.164, calls register API
export const register = async (payload: any) => {
  formatPhonePayload(payload);
  return await api.post(`${NETWORK_CONFIG.AUTH_BASE_URL}/register`, payload);
};

// Login with phone and password
// Formats phone, extracts user info and tokens, saves to storage
export const login = async (payload: any) => {
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
};

// Logout current user
export const logout = async (deviceId?: string) => {
  const payload = deviceId ? { deviceId } : {};
  return await api.post(`${NETWORK_CONFIG.AUTH_BASE_URL}/logout`, payload);
};

// Delete all device tokens for current user
// Used during logout to stop push notifications on all devices
export const deleteAllDeviceTokens = async () => {
  return await api.delete(`${NETWORK_CONFIG.AUTH_BASE_URL}/device-tokens`);
};

// Reset password with Firebase token
export const resetPassword = async (payload: any) => {
  return await api.post(`${NETWORK_CONFIG.AUTH_BASE_URL}/reset-password`, payload);
};

// Generate QR code for login
export const qrGenerate = async (payload?: any) => {
  return await api.post(`${NETWORK_CONFIG.AUTH_BASE_URL}/qr/generate`, payload || {});
};

// Check QR code login status
export const qrStatus = async (qrId: string) => {
  return await api.get(`${NETWORK_CONFIG.AUTH_BASE_URL}/qr/status/${qrId}`);
};

// Confirm QR code login from another device
export const qrConfirm = async (sessionId: string, payload?: any) => {
  const url = `${NETWORK_CONFIG.AUTH_BASE_URL}/qr/confirm`;
  const body = { sessionId, ...payload };
  return await api.post(url, body);
};

// Reject QR code login from another device
export const qrReject = async (sessionId: string, payload?: any) => {
  const url = `${NETWORK_CONFIG.AUTH_BASE_URL}/qr/reject`;
  const body = { sessionId, ...payload };
  return await api.post(url, body);
};

// Refresh access token using refresh token
export const refreshToken = async (refreshToken: string) => {
  const response = await api.post(`${NETWORK_CONFIG.AUTH_BASE_URL}/refresh`, {
    refreshToken,
  });
  return response;
};

export default {
  checkPhoneExists,
  login,
  logout,
  deleteAllDeviceTokens,
  qrConfirm,
  qrGenerate,
  qrReject,
  qrStatus,
  register,
  resetPassword,
  refreshToken,
};
