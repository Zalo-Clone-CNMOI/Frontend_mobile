/**
 * Probes API + Socket ports from .env / defaults (run: npm run check:backend)
 */
const host = process.env.EXPO_PUBLIC_API_HOST || '18.138.217.102';
const apiPort = process.env.EXPO_PUBLIC_API_PORT || '5000';
const socketPort = process.env.EXPO_PUBLIC_SOCKET_PORT || '3001';

const probes = [
  { name: 'api-health', url: `http://${host}:${apiPort}/api/health` },
  { name: 'api-root-health', url: `http://${host}:${apiPort}/health` },
  {
    name: 'socket-polling',
    url: `http://${host}:${socketPort}/socket.io/?EIO=4&transport=polling`,
  },
];

const probe = async ({ name, url }) => {
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    console.log(`[${name}] ${res.status} ${url} (${Date.now() - started}ms)`);
    return res.ok;
  } catch (error) {
    console.error(`[${name}] FAIL ${url} — ${error.message}`);
    return false;
  }
};

console.log(`Checking backend at ${host} (API :${apiPort}, Socket :${socketPort})`);
const results = await Promise.all(probes.map(probe));
process.exit(results.some(Boolean) ? 0 : 1);
