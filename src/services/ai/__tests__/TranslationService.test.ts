import { translationService } from '../TranslationService';
import { WsEvents } from '../../../realtime/events';
import { useAITranslationStore } from '../../../store/useAITranslationStore';

// ---- mocks for the socket + auth dependencies -----------------------------
const mockEmit = jest.fn();
let mockSocket: { connected: boolean; emit: jest.Mock } | null = {
  connected: true,
  emit: mockEmit,
};
const mockEnsureAuth = jest.fn();

jest.mock('../../socket', () => ({
  getSocket: () => mockSocket,
}));
jest.mock('../utils', () => ({
  ensureFreshSocketAuth: () => mockEnsureAuth(),
}));

const OPTS = {
  conversationId: 'c1',
  userId: 'u1',
  messageId: 'm1',
  body: 'Hello',
  targetLanguage: 'vi',
};

const resetStore = () =>
  useAITranslationStore.setState({
    cache: new Map(),
    loadingByMessage: new Map(),
    errorByMessage: new Map(),
  });

describe('TranslationService.requestTranslation (Issue #3)', () => {
  beforeEach(() => {
    resetStore();
    mockEmit.mockReset();
    mockEnsureAuth.mockReset().mockResolvedValue(true);
    mockSocket = { connected: true, emit: mockEmit };
    // Fake timers so the 20s safety timeout never leaks past a test (and so the
    // timeout tests can advance it deterministically).
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('sets loading before emit and publishes ai:translate:request (happy path)', async () => {
    const ok = await translationService.requestTranslation(OPTS);

    expect(ok).toBe(true);
    expect(useAITranslationStore.getState().isLoading('m1', 'vi')).toBe(true);
    expect(useAITranslationStore.getState().getError('m1', 'vi')).toBeNull();
    expect(mockEmit).toHaveBeenCalledTimes(1);
    const [event, payload] = mockEmit.mock.calls[0];
    expect(event).toBe(WsEvents.AiTranslateRequest);
    expect(payload).toMatchObject({
      message_id: 'm1',
      conversation_id: 'c1',
      body: 'Hello',
      target_language: 'vi',
    });
  });

  it('surfaces a human-readable error and stops loading when auth fails', async () => {
    mockEnsureAuth.mockResolvedValue(false);

    const ok = await translationService.requestTranslation(OPTS);

    expect(ok).toBe(false);
    expect(mockEmit).not.toHaveBeenCalled();
    expect(useAITranslationStore.getState().isLoading('m1', 'vi')).toBe(false);
    expect(useAITranslationStore.getState().getError('m1', 'vi')).toBe(
      'Không thể kết nối để dịch. Vui lòng thử lại.'
    );
  });

  it('surfaces a connection error when the socket is not connected', async () => {
    mockSocket = { connected: false, emit: mockEmit };

    const ok = await translationService.requestTranslation(OPTS);

    expect(ok).toBe(false);
    expect(useAITranslationStore.getState().isLoading('m1', 'vi')).toBe(false);
    expect(useAITranslationStore.getState().getError('m1', 'vi')).toBe(
      'Không thể kết nối để dịch. Vui lòng thử lại.'
    );
  });

  it('surfaces the ack error string and stops loading', async () => {
    mockEmit.mockImplementation((_event, _payload, ack: (r: unknown) => void) => {
      ack({ error: 'engine unavailable' });
    });

    await translationService.requestTranslation(OPTS);

    expect(useAITranslationStore.getState().isLoading('m1', 'vi')).toBe(false);
    expect(useAITranslationStore.getState().getError('m1', 'vi')).toBe('engine unavailable');
  });

  it('falls back to a generic message when the ack error is not a string', async () => {
    mockEmit.mockImplementation((_event, _payload, ack: (r: unknown) => void) => {
      ack({ error: { code: 500 } });
    });

    await translationService.requestTranslation(OPTS);

    expect(useAITranslationStore.getState().getError('m1', 'vi')).toBe(
      'Dịch thất bại. Vui lòng thử lại.'
    );
  });

  it('times out to a retryable error after 20s when no result arrives', async () => {
    jest.useFakeTimers();

    await translationService.requestTranslation(OPTS);
    expect(useAITranslationStore.getState().isLoading('m1', 'vi')).toBe(true);

    jest.advanceTimersByTime(20000);

    expect(useAITranslationStore.getState().isLoading('m1', 'vi')).toBe(false);
    expect(useAITranslationStore.getState().getError('m1', 'vi')).toBe(
      'Dịch quá thời gian chờ. Vui lòng thử lại.'
    );
  });

  it('the timeout is a no-op once a result has already arrived', async () => {
    jest.useFakeTimers();

    await translationService.requestTranslation(OPTS);
    // Simulate AIHandler receiving ai:translate:result (clears loading + error).
    useAITranslationStore.getState().setTranslation('m1', 'vi', 'Hello', 'Xin chào');

    jest.advanceTimersByTime(20000);

    // No spurious timeout error on a successfully translated message.
    expect(useAITranslationStore.getState().getError('m1', 'vi')).toBeNull();
    expect(useAITranslationStore.getState().isLoading('m1', 'vi')).toBe(false);
    expect(useAITranslationStore.getState().getTranslation('m1', 'vi')).toEqual({
      original: 'Hello',
      translated: 'Xin chào',
    });
  });
});
