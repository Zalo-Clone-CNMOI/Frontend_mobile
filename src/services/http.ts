import axios from "axios";
import { NETWORK_CONFIG } from "../config/network";
import { getCurrentToken, refreshAccessToken } from "./authService";

const api = axios.create({
  baseURL: NETWORK_CONFIG.BFF_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getCurrentToken();
      console.log('[HTTP] Token retrieved:', token ? 'Yes (length: ' + token.length + ')' : 'No token');
      if (token && config && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('[HTTP] Authorization header set:', config.headers.Authorization.substring(0, 30) + '...');
      }
    } catch (err) {
      console.error('[HTTP] Error getting token:', err);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: any = error.config;
    // Handle 401 (token expired) and 403 (account inactive/locked)
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403) &&
      !originalRequest?._retry
    ) {
      originalRequest._retry = true;
      // 403 (account inactive/locked) - không thể refresh, cần logout
      if (error.response.status === 403) {
        // Clear auth data và redirect login
        const { clearAuthData } = await import('./authService');
        await clearAuthData();
        return Promise.reject(error);
      }
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${newToken}`,
          };
          return api(originalRequest);
        }
      } catch (e) {
      }
    }
    return Promise.reject(error);
  },
);

export default api;
