import { AxiosInstance } from "axios";
import {
  AccessTokenProvider,
  RefreshAccessTokenProvider,
  RealtimeHostConfig,
} from "../../types/realtimeBff";
import api from "../http";

export type CreateBffHttpClientOptions = RealtimeHostConfig & {
  getAccessToken: AccessTokenProvider;
  refreshAccessToken?: RefreshAccessTokenProvider;
  timeoutMs?: number;
};

/** @deprecated Options ignored — uses shared axios client from http.ts */
export const createBffHttpClient = (
  _options?: CreateBffHttpClientOptions,
): AxiosInstance => api;

const normalizeApiPrefix = (value: string | undefined) => {
  if (!value) return "";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, "");
};

export const createBffEndpointBuilder = (
  apiPrefix = "",
) => {
  const normalizedPrefix = normalizeApiPrefix(apiPrefix);
  return (path: string) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedPrefix}${normalizedPath}`;
  };
};
