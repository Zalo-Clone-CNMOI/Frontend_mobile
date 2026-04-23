type MaybeString = string | undefined;

const readEnv = (key: string, fallback: string): string => {
  const raw = (process.env[key as keyof NodeJS.ProcessEnv] as MaybeString) || '';
  const value = raw.trim();
  return value.length > 0 ? value : fallback;
};

const readEnvNumber = (key: string, fallback: number): number => {
  const raw = (process.env[key as keyof NodeJS.ProcessEnv] as MaybeString) || '';
  const value = raw.trim();
  const parsed = parseInt(value, 10);
  return !isNaN(parsed) && value.length > 0 ? parsed : fallback;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

// Single source of truth for backend host
// Default to localhost for local development, override with env for production
const API_HOST = readEnv('EXPO_PUBLIC_API_HOST', '18.138.217.102');

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

// S3 Configuration
const S3_BUCKET = readEnv('EXPO_PUBLIC_S3_BUCKET', 'zalo-bucket-clone');
const S3_REGION = readEnv('EXPO_PUBLIC_S3_REGION', 'ap-southeast-1');
const S3_BASE_URL = trimTrailingSlash(`https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`);

// Media Upload Configuration
const S3_UPLOAD_TIMEOUT = readEnvNumber('EXPO_PUBLIC_S3_UPLOAD_TIMEOUT', 60000); // 60s default
const PRESIGN_UPLOAD_TIMEOUT = readEnvNumber('EXPO_PUBLIC_PRESIGN_UPLOAD_TIMEOUT', 10000); // 10s default
const CONFIRM_UPLOAD_TIMEOUT = readEnvNumber('EXPO_PUBLIC_CONFIRM_UPLOAD_TIMEOUT', 30000); // 30s default
const PRESIGN_DOWNLOAD_TIMEOUT = readEnvNumber('EXPO_PUBLIC_PRESIGN_DOWNLOAD_TIMEOUT', 15000); // 15s default
const MAX_FILE_SIZE_IMAGE = readEnvNumber('EXPO_PUBLIC_MAX_FILE_SIZE_IMAGE', 52428800); // 50MB default
const MAX_FILE_SIZE_VIDEO = readEnvNumber('EXPO_PUBLIC_MAX_FILE_SIZE_VIDEO', 104857600); // 100MB default
const MAX_FILE_SIZE_AUDIO = readEnvNumber('EXPO_PUBLIC_MAX_FILE_SIZE_AUDIO', 10485760); // 10MB default
const MAX_FILE_SIZE_DOCUMENT = readEnvNumber('EXPO_PUBLIC_MAX_FILE_SIZE_DOCUMENT', 10485760); // 10MB default

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
  S3_REGION,
  S3_BASE_URL,
  S3_UPLOAD_TIMEOUT,
  PRESIGN_UPLOAD_TIMEOUT,
  CONFIRM_UPLOAD_TIMEOUT,
  PRESIGN_DOWNLOAD_TIMEOUT,
  MAX_FILE_SIZE_IMAGE,
  MAX_FILE_SIZE_VIDEO,
  MAX_FILE_SIZE_AUDIO,
  MAX_FILE_SIZE_DOCUMENT,
} as const;
