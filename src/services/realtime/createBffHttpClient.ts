import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import {
  AccessTokenProvider,
  RefreshAccessTokenProvider,
  RealtimeHostConfig,
} from "../../types/realtimeBff";
import { NETWORK_CONFIG } from "../../config/network";

// Extract host from NETWORK_CONFIG (remove http:// and port)
const extractHost = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
};

const DEFAULT_HOST = extractHost(NETWORK_CONFIG.API_BASE_URL);
const DEFAULT_HTTP_PORT = Number(NETWORK_CONFIG.API_BASE_URL.split(':')[2]?.split('/')[0] || '5000');

export type CreateBffHttpClientOptions = RealtimeHostConfig & {
  getAccessToken: AccessTokenProvider;
  refreshAccessToken?: RefreshAccessTokenProvider;
  timeoutMs?: number;
};

const normalizeApiPrefix = (value: string | undefined) => {
  if (!value) return "";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, "");
};

const buildBaseUrl = ({
  host = DEFAULT_HOST,
  httpPort = DEFAULT_HTTP_PORT,
}: RealtimeHostConfig) => `http://${host}:${httpPort}`;

export const createBffHttpClient = ({
  host = DEFAULT_HOST,
  httpPort = DEFAULT_HTTP_PORT,
  getAccessToken,
  refreshAccessToken,
  timeoutMs = 10_000,
}: CreateBffHttpClientOptions): AxiosInstance => {
  const client = axios.create({
    baseURL: buildBaseUrl({ host, httpPort }),
    timeout: timeoutMs,
  });

  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (!refreshAccessToken || !error.config) {
        return Promise.reject(error);
      }

      const status = error.response?.status;
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return client(originalRequest);
    },
  );

  return client;
};

export const createBffEndpointBuilder = (
  apiPrefix = "/api",
) => {
  const normalizedPrefix = normalizeApiPrefix(apiPrefix);
  return (path: string) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedPrefix}${normalizedPath}`;
  };
};
