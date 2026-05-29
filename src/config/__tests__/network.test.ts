/* eslint-disable @typescript-eslint/no-require-imports --
   network.ts reads process.env at module-evaluation time, so we require() it
   after jest.resetModules() to exercise different env values. Dynamic import()
   is not usable in this jest setup. */

describe('NETWORK_CONFIG (Issue #10)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.EXPO_PUBLIC_API_HOST;
    delete process.env.EXPO_PUBLIC_API_PORT;
    delete process.env.EXPO_PUBLIC_ZAI_BOT_ID;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  it('builds API_BASE_URL / SOCKET_URL from EXPO_PUBLIC_* env vars', () => {
    process.env.EXPO_PUBLIC_API_HOST = '10.0.0.5';
    process.env.EXPO_PUBLIC_API_PORT = '5000';
    const { NETWORK_CONFIG } = require('../network');

    expect(NETWORK_CONFIG.API_HOST).toBe('10.0.0.5');
    expect(NETWORK_CONFIG.API_BASE_URL).toBe('http://10.0.0.5:5000/api');
    expect(NETWORK_CONFIG.SOCKET_URL).toBe('http://10.0.0.5:3001');
  });

  it('falls back to localhost (NOT a production IP) when the host env is unset', () => {
    const { NETWORK_CONFIG } = require('../network');
    expect(NETWORK_CONFIG.API_HOST).toBe('localhost');
    expect(NETWORK_CONFIG.API_BASE_URL).toBe('http://localhost:5000/api');
    // dev-only warning that the host env is missing
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('EXPO_PUBLIC_API_HOST is not set'),
    );
  });

  it('overrides ZAI_BOT_ID from EXPO_PUBLIC_ZAI_BOT_ID', () => {
    process.env.EXPO_PUBLIC_ZAI_BOT_ID = 'custom-zai-bot';
    expect(require('../network').NETWORK_CONFIG.ZAI_BOT_ID).toBe('custom-zai-bot');
  });

  it('uses the documented default ZAI_BOT_ID when the env var is unset', () => {
    // beforeEach already deletes EXPO_PUBLIC_ZAI_BOT_ID + resets modules.
    expect(require('../network').NETWORK_CONFIG.ZAI_BOT_ID).toBe(
      '00000000-0000-4000-8000-0000000000a1',
    );
  });
});
