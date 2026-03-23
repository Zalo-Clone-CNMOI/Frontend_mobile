type MaybeString = string | undefined;

const readEnv = (key: string, fallback: string): string => {
  const raw = (process.env[key as keyof NodeJS.ProcessEnv] as MaybeString) || '';
  const value = raw.trim();
  return value.length > 0 ? value : fallback;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const BFF_BASE_URL = trimTrailingSlash(
  readEnv('EXPO_PUBLIC_BFF_BASE_URL', 'http://54.179.206.215:3000'),
);

const API_BASE_URL = trimTrailingSlash(
  readEnv('EXPO_PUBLIC_API_BASE_URL', 'http://54.179.206.215:5000/api'),
);

const AUTH_BASE_URL = trimTrailingSlash(
  readEnv('EXPO_PUBLIC_AUTH_BASE_URL', 'http://54.179.206.215:5000/api/auth'),
);

const SOCKET_URL = trimTrailingSlash(
  readEnv('EXPO_PUBLIC_SOCKET_URL', 'http://54.179.206.215:3001'),
);

const MESSAGE_BASE_URL = trimTrailingSlash(
  readEnv('EXPO_PUBLIC_MESSAGE_BASE_URL', 'http://54.179.206.215:5000'),
);

const AUTH_REFRESH_URL = trimTrailingSlash(
  readEnv('EXPO_PUBLIC_AUTH_REFRESH_URL', `${AUTH_BASE_URL}/refresh`),
);

export const NETWORK_CONFIG = {
  API_BASE_URL,
  AUTH_BASE_URL,
  AUTH_LOGIN_URL: `${AUTH_BASE_URL}/login`,
  AUTH_REFRESH_URL,
  BFF_BASE_URL,
  MESSAGE_BASE_URL,
  SOCKET_URL,
} as const;
