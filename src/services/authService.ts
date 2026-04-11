import AsyncStorage from "@react-native-async-storage/async-storage";
import { NETWORK_CONFIG } from "../config/network";

const AUTH_KEYS = {
  ACCESS_TOKEN: "@access_token",
  REFRESH_TOKEN: "@refresh_token",
  USER_INFO: "@user_info",
  PHONE_NUMBER: "@phone_number",
  IS_LOGGED_IN: "@is_logged_in",
};

export interface UserInfo {
  phone: string;
  password?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
  id?: string;
  status?: string;
  createdAt?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  loginTime?: number;
}

type AuthCache = {
  accessToken: string | null;
  refreshToken: string | null;
  loaded: boolean;
};

const authCache: AuthCache = {
  accessToken: null,
  refreshToken: null,
  loaded: false,
};

let ongoingRefreshPromise: Promise<string | null> | null = null;

const REFRESH_ENDPOINT = NETWORK_CONFIG.AUTH_REFRESH_URL;

const shouldClearAuthOnRefreshError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (!message) return false;
  if (message.includes("no refresh token available")) return true;
  if (message.includes("(401)") || message.includes("(403)")) return true;

  return (
    message.includes("refresh token") &&
    (message.includes("invalid") ||
      message.includes("expired") ||
      message.includes("revoked") ||
      message.includes("unauthorized"))
  );
};

const fetchWithTimeout = async (
  endpoint: string,
  body: Record<string, string>,
  timeoutMs = 8000,
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const hydrateTokenCache = async () => {
  if (authCache.loaded) return;

  const [accessToken, refreshToken] = await AsyncStorage.multiGet([
    AUTH_KEYS.ACCESS_TOKEN,
    AUTH_KEYS.REFRESH_TOKEN,
  ]);

  authCache.accessToken = accessToken?.[1] || null;
  authCache.refreshToken = refreshToken?.[1] || null;
  authCache.loaded = true;
};

const saveTokensOnly = async (
  accessToken: string,
  refreshToken: string,
) => {
  await AsyncStorage.multiSet([
    [AUTH_KEYS.ACCESS_TOKEN, accessToken],
    [AUTH_KEYS.REFRESH_TOKEN, refreshToken],
    [AUTH_KEYS.IS_LOGGED_IN, "true"],
  ]);

  authCache.accessToken = accessToken || null;
  authCache.refreshToken = refreshToken || null;
  authCache.loaded = true;
};

export const saveAuthData = async (userInfo: UserInfo) => {
  try {
    const accessToken = userInfo.tokens?.accessToken || "";
    const refreshToken = userInfo.tokens?.refreshToken || "";

    await AsyncStorage.multiSet([
      [AUTH_KEYS.ACCESS_TOKEN, accessToken],
      [AUTH_KEYS.REFRESH_TOKEN, refreshToken],
      [AUTH_KEYS.USER_INFO, JSON.stringify(userInfo)],
      [AUTH_KEYS.PHONE_NUMBER, userInfo.phone],
      [AUTH_KEYS.IS_LOGGED_IN, "true"],
    ]);

    authCache.accessToken = accessToken || null;
    authCache.refreshToken = refreshToken || null;
    authCache.loaded = true;
  } catch (error) {
  }
};

export const getAuthData = async (): Promise<UserInfo | null> => {
  try {
    const results = await AsyncStorage.multiGet([
      AUTH_KEYS.ACCESS_TOKEN,
      AUTH_KEYS.REFRESH_TOKEN,
      AUTH_KEYS.USER_INFO,
      AUTH_KEYS.PHONE_NUMBER,
      AUTH_KEYS.IS_LOGGED_IN,
    ]);

    const accessToken = results[0]?.[1] || null;
    const refreshToken = results[1]?.[1] || null;
    const userInfoStr = results[2]?.[1] || null;
    const phoneNumber = results[3]?.[1] || null;
    const isLoggedIn = results[4]?.[1] || null;

    if (isLoggedIn === "true" && userInfoStr && phoneNumber) {
      const userInfo = JSON.parse(userInfoStr);
      return {
        ...userInfo,
        tokens: {
          accessToken: accessToken || userInfo.tokens?.accessToken || "",
          refreshToken: refreshToken || userInfo.tokens?.refreshToken || "",
          expiresIn: userInfo.tokens?.expiresIn || 0,
        },
        phone: phoneNumber,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};

export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([
      AUTH_KEYS.ACCESS_TOKEN,
      AUTH_KEYS.REFRESH_TOKEN,
      AUTH_KEYS.USER_INFO,
      AUTH_KEYS.PHONE_NUMBER,
      AUTH_KEYS.IS_LOGGED_IN,
    ]);

    authCache.accessToken = null;
    authCache.refreshToken = null;
    authCache.loaded = true;
  } catch (error) {
  }
};

export const isLoggedIn = async (): Promise<boolean> => {
  try {
    const isLoggedInValue = await AsyncStorage.getItem(AUTH_KEYS.IS_LOGGED_IN);
    return isLoggedInValue === "true";
  } catch (error) {
    return false;
  }
};

export const getCurrentToken = async (): Promise<string | null> => {
  try {
    await hydrateTokenCache();
    const token = authCache.accessToken;
    if (token && __DEV__) {
      try {
        const payloadStr = token.split('.')[1];
        if (payloadStr) {
        }
      } catch (e) {}
    }
    return token;
  } catch (error) {
    return null;
  }
};

export const getCurrentRefreshToken = async (): Promise<string | null> => {
  try {
    await hydrateTokenCache();
    return authCache.refreshToken;
  } catch (error) {
    return null;
  }
};

export const refreshAccessToken = async (): Promise<string | null> => {
  if (ongoingRefreshPromise) {
    return ongoingRefreshPromise;
  }

  ongoingRefreshPromise = (async () => {
    try {
      const refreshToken = await getCurrentRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await fetchWithTimeout(REFRESH_ENDPOINT, { refreshToken });
      const data = await response.json().catch(() => null);
      const tokenPayload = data?.data || data;

      if (!response.ok) {
        throw new Error(data?.message || `Failed to refresh token (${response.status})`);
      }

      const currentAuthData = await getAuthData();
      if (!currentAuthData) {
        return null;
      }

      const newAccessToken =
        tokenPayload?.tokens?.accessToken ||
        tokenPayload?.accessToken ||
        "";
      const newRefreshToken =
        tokenPayload?.tokens?.refreshToken ||
        tokenPayload?.refreshToken ||
        refreshToken;
      const expiresIn =
        tokenPayload?.tokens?.expiresIn ||
        tokenPayload?.expiresIn ||
        0;

      if (!newAccessToken) {
        throw new Error("Refresh response missing access token");
      }

      if (currentAuthData) {
        await saveAuthData({
          ...currentAuthData,
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn,
          },
        });
      } else {
        await saveTokensOnly(newAccessToken, newRefreshToken);
      }

      return newAccessToken || null;
    } catch (error) {
      if (shouldClearAuthOnRefreshError(error)) {
        await clearAuthData();
      }
      return null;
    } finally {
      ongoingRefreshPromise = null;
    }
  })();

  return ongoingRefreshPromise;
};

export const getCurrentUser = async (): Promise<UserInfo | null> => {
  try {
    const userInfoStr = await AsyncStorage.getItem(AUTH_KEYS.USER_INFO);
    return userInfoStr ? JSON.parse(userInfoStr) : null;
  } catch (error) {
    return null;
  }
};

export const apiCallWithRefresh = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  try {
    let accessToken = await getCurrentToken();

    if (!accessToken) {
      accessToken = await refreshAccessToken();
      if (!accessToken) {
        throw new Error("No valid token available after refresh");
      }
    }

    const isFormDataBody =
      typeof FormData !== "undefined" && options.body instanceof FormData;
    const baseHeaders: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${accessToken}`,
    };
    if (!isFormDataBody && !baseHeaders["Content-Type"]) {
      baseHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      ...options,
      headers: baseHeaders,
    });

    if (response.status === 401) {
      const newAccessToken = await refreshAccessToken();
      if (!newAccessToken) {
        throw new Error("Failed to refresh token after 401");
      }

      return fetch(url, {
        ...options,
        headers: {
          ...baseHeaders,
          Authorization: `Bearer ${newAccessToken}`,
        },
      });
    }

    return response;
  } catch (error) {
    throw error;
  }
};
