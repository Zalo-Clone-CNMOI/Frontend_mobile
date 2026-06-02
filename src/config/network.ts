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



// Single source of truth for backend host.
// Dev-safe default (localhost); production/preview/dev EAS builds inject
// EXPO_PUBLIC_API_HOST via eas.json, so no production IP is baked into source.
const API_HOST = readEnv('EXPO_PUBLIC_API_HOST', 'localhost');

if (__DEV__ && !(process.env.EXPO_PUBLIC_API_HOST ?? '').trim()) {
  console.warn(
    '[NETWORK_CONFIG] EXPO_PUBLIC_API_HOST is not set; defaulting to "localhost". ' +
      'Set it in .env (local) or eas.json (device/prod builds) to reach a real backend.',
  );
}



// Service ports

const BFF_PORT = readEnv('EXPO_PUBLIC_BFF_PORT', '3000');

const API_PORT = readEnv('EXPO_PUBLIC_API_PORT', '5000');

const SOCKET_PORT = readEnv('EXPO_PUBLIC_SOCKET_PORT', '3001');

const SSO_PORT = readEnv('EXPO_PUBLIC_SSO_PORT', '5001');



// Shared HTTP timeout for axios + fetch wrappers
const HTTP_TIMEOUT_MS = readEnvNumber('EXPO_PUBLIC_HTTP_TIMEOUT_MS', 15000);

// AI/LLM endpoints (entity-info, catch-up) generate via an LLM on a cache miss,
// which routinely runs longer than the default 15s — the request would abort
// mid-generation ("Request timeout after 15000ms"). Give them a longer client
// timeout; the server bounds its own work just under this so it answers first.
const AI_HTTP_TIMEOUT_MS = readEnvNumber('EXPO_PUBLIC_AI_HTTP_TIMEOUT_MS', 30000);

// API root without /api suffix (media presign, health probes)
const API_ROOT_URL = trimTrailingSlash(`http://${API_HOST}:${API_PORT}`);

// Legacy alias — same host/port as API (do not use port 3000 unless BFF is deployed)
const BFF_BASE_URL = API_ROOT_URL;

// BFF AI routes (/ai-assist, /entity-info) are served under API_BASE_URL in every
// env — i.e. http://{EXPO_PUBLIC_API_HOST}:{EXPO_PUBLIC_API_PORT}/api.
const API_BASE_URL = trimTrailingSlash(`${API_ROOT_URL}/api`);

const AUTH_BASE_URL = trimTrailingSlash(`http://${API_HOST}:${API_PORT}/api/auth`);

const SOCKET_URL = trimTrailingSlash(`http://${API_HOST}:${SOCKET_PORT}`);

const MESSAGE_BASE_URL = API_ROOT_URL;

const MEDIA_BASE_URL = API_ROOT_URL;

const MEDIA_FILE_BASE_URL = API_ROOT_URL;

const SSO_BASE_URL = trimTrailingSlash(`http://${API_HOST}:${SSO_PORT}`);

const AUTH_REFRESH_URL = trimTrailingSlash(`${AUTH_BASE_URL}/refresh`);



// Zai bot id — overridable via env so it isn't hard-pinned in source.
const ZAI_BOT_ID = readEnv('EXPO_PUBLIC_ZAI_BOT_ID', '00000000-0000-4000-8000-0000000000a1');

// Zai bot avatar URL — set via env when the avatar asset is uploaded to S3
const ZAI_AVATAR_URL = readEnv('EXPO_PUBLIC_ZAI_AVATAR_URL', '');

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



if (__DEV__) {
  console.log('[NETWORK_CONFIG]', {
    API_HOST,
    API_ROOT_URL,
    API_BASE_URL,
    SOCKET_URL,
    SSO_BASE_URL,
    HTTP_TIMEOUT_MS,
    BFF_PORT,
  });
}

export const NETWORK_CONFIG = {
  API_HOST,
  API_PORT: Number(API_PORT),
  SOCKET_PORT: Number(SOCKET_PORT),
  SSO_PORT: Number(SSO_PORT),
  HTTP_TIMEOUT_MS,
  AI_HTTP_TIMEOUT_MS,
  API_ROOT_URL,
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

  ZAI_BOT_ID,

  ZAI_AVATAR_URL,

} as const;

