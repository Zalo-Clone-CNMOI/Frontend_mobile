import { NETWORK_CONFIG } from '../config/network';

export type ServiceProbe = {
  ok: boolean;
  url: string;
  status?: number;
  error?: string;
  latencyMs?: number;
};

export type ConnectivityReport = {
  api: ServiceProbe;
  socket: ServiceProbe;
  checkedAt: string;
};

const probeHttp = async (
  url: string,
  timeoutMs = 8000,
  init?: RequestInit,
): Promise<ServiceProbe> => {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      url,
      status: response.status,
      latencyMs: Date.now() - started,
    };
  } catch (error: any) {
    return {
      ok: false,
      url,
      error: error?.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : error?.message || String(error),
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
};

const probeApiHealth = async (): Promise<ServiceProbe> => {
  const candidates = [
    `${NETWORK_CONFIG.API_BASE_URL}/health`,
    `${NETWORK_CONFIG.MEDIA_BASE_URL}/health`,
    `${NETWORK_CONFIG.MEDIA_BASE_URL}/api/health`,
  ];

  let last: ServiceProbe = {
    ok: false,
    url: candidates[0],
    error: 'No health endpoint responded',
  };

  for (const url of candidates) {
    const result = await probeHttp(url, 8000);
    last = result;
    if (result.ok) return result;
    if (result.status && result.status !== 404) return result;
  }

  return last;
};

const probeSocket = async (): Promise<ServiceProbe> => {
  const url = `${NETWORK_CONFIG.SOCKET_URL}/socket.io/?EIO=4&transport=polling`;
  return probeHttp(url, 8000);
};

export const probeBackendConnectivity = async (): Promise<ConnectivityReport> => {
  const [api, socket] = await Promise.all([probeApiHealth(), probeSocket()]);

  return {
    api,
    socket,
    checkedAt: new Date().toISOString(),
  };
};

export const logConnectivityReport = async (): Promise<ConnectivityReport> => {
  const report = await probeBackendConnectivity();
  console.log('[Connectivity]', JSON.stringify(report, null, 2));
  return report;
};
