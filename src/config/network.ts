type MaybeString = string | undefined;

const readEnv = (key: string, fallback: string): string => {
  const raw = (process.env[key as keyof NodeJS.ProcessEnv] as MaybeString) || '';
  const value = raw.trim();
  return value.length > 0 ? value : fallback;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

// Single source of truth for backend host
// const API_HOST = readEnv('EXPO_PUBLIC_API_HOST', '54.179.206.215');
// Default to localhost for local development, override with env for production
const API_HOST = readEnv('EXPO_PUBLIC_API_HOST', 'localhost');

// Service ports
const BFF_PORT = readEnv('EXPO_PUBLIC_BFF_PORT', '3000');
const API_PORT = readEnv('EXPO_PUBLIC_API_PORT', '5000');
const SOCKET_PORT = readEnv('EXPO_PUBLIC_SOCKET_PORT', '3001');
const SSO_PORT = readEnv('EXPO_PUBLIC_SSO_PORT', '5001');

// Build URLs from host + port (single source of truth, no duplication)
const BFF_BASE_URL = trimTrailingSlash(`http://${API_HOST}:${BFF_PORT}`);
const API_BASE_URL = trimTrailingSlash(`http://${API_HOST}:${API_PORT}/api`);
const AUTH_BASE_URL = trimTrailingSlash(`http://${API_HOST}:${API_PORT}/api/auth`);
const SOCKET_URL = trimTrailingSlash(`http://${API_HOST}:${SOCKET_PORT}`);
const MESSAGE_BASE_URL = trimTrailingSlash(`http://${API_HOST}:${API_PORT}`);
const MEDIA_BASE_URL = trimTrailingSlash(`http://${API_HOST}:${API_PORT}`);
const MEDIA_FILE_BASE_URL = trimTrailingSlash(`http://${API_HOST}:${API_PORT}`);
const SSO_BASE_URL = trimTrailingSlash(`http://${API_HOST}:${SSO_PORT}`);
const AUTH_REFRESH_URL = trimTrailingSlash(`${AUTH_BASE_URL}/refresh`);

const S3_BUCKET = readEnv('EXPO_PUBLIC_S3_BUCKET', 'onn-bucket-23');

export const NETWORK_CONFIG = {
  API_BASE_URL,
  AUTH_BASE_URL,
  AUTH_LOGIN_URL: `${AUTH_BASE_URL}/login`,
  AUTH_REFRESH_URL,
  BFF_BASE_URL,
  MEDIA_BASE_URL,
  MEDIA_FILE_BASE_URL,
  MESSAGE_BASE_URL,
  SOCKET_URL,
  SSO_BASE_URL,
  S3_BUCKET,
} as const;
