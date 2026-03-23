import axios from "axios";
import { NETWORK_CONFIG } from "../config/network";
import { getCurrentToken, refreshAccessToken } from "./authService";

const api = axios.create({
  baseURL: NETWORK_CONFIG.BFF_BASE_URL,
  timeout: 10000, // 10 second timeout
});

// Attach access token to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getCurrentToken();
      if (token && config && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error("Request interceptor error:", err);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// On 401, try refresh once then retry original request
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: any = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest?._retry
    ) {
      originalRequest._retry = true;
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
        console.error("Refresh token failed from axios interceptor:", e);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
