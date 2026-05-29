import { useAITranslationStore } from '../useAITranslationStore';

const reset = () =>
  useAITranslationStore.setState({
    cache: new Map(),
    loadingByMessage: new Map(),
    errorByMessage: new Map(),
  });

describe('useAITranslationStore — loading/error state (Issue #3)', () => {
  beforeEach(reset);

  it('setLoading toggles isLoading via a NEW Map reference', () => {
    const before = useAITranslationStore.getState().loadingByMessage;
    useAITranslationStore.getState().setLoading('m1', 'vi', true);
    const after = useAITranslationStore.getState().loadingByMessage;

    expect(after).not.toBe(before); // immutable update
    expect(useAITranslationStore.getState().isLoading('m1', 'vi')).toBe(true);

    useAITranslationStore.getState().setLoading('m1', 'vi', false);
    expect(useAITranslationStore.getState().isLoading('m1', 'vi')).toBe(false);
  });

  it('setError stores then clears a human-readable error via a NEW Map reference', () => {
    const before = useAITranslationStore.getState().errorByMessage;
    useAITranslationStore.getState().setError('m1', 'vi', 'Dịch thất bại.');
    const after = useAITranslationStore.getState().errorByMessage;

    expect(after).not.toBe(before);
    expect(useAITranslationStore.getState().getError('m1', 'vi')).toBe('Dịch thất bại.');

    useAITranslationStore.getState().setError('m1', 'vi', null);
    expect(useAITranslationStore.getState().getError('m1', 'vi')).toBeNull();
  });

  it('keys loading/error per message + language independently', () => {
    useAITranslationStore.getState().setLoading('m1', 'vi', true);
    useAITranslationStore.getState().setError('m1', 'en', 'boom');

    expect(useAITranslationStore.getState().isLoading('m1', 'vi')).toBe(true);
    expect(useAITranslationStore.getState().isLoading('m1', 'en')).toBe(false);
    expect(useAITranslationStore.getState().getError('m1', 'en')).toBe('boom');
    expect(useAITranslationStore.getState().getError('m1', 'vi')).toBeNull();
  });

  it('isLoading / getError default safely for unknown keys', () => {
    expect(useAITranslationStore.getState().isLoading('nope', 'vi')).toBe(false);
    expect(useAITranslationStore.getState().getError('nope', 'vi')).toBeNull();
  });

  it('setTranslation clears in-flight loading AND error for that key', () => {
    const store = useAITranslationStore.getState();
    store.setLoading('m1', 'vi', true);
    store.setError('m1', 'vi', 'stale timeout error');

    store.setTranslation('m1', 'vi', 'hello', 'xin chào');

    expect(useAITranslationStore.getState().isLoading('m1', 'vi')).toBe(false);
    expect(useAITranslationStore.getState().getError('m1', 'vi')).toBeNull();
    expect(useAITranslationStore.getState().getTranslation('m1', 'vi')).toEqual({
      original: 'hello',
      translated: 'xin chào',
    });
  });

  it('getTranslation returns null when nothing is cached', () => {
    expect(useAITranslationStore.getState().getTranslation('none', 'vi')).toBeNull();
  });

  describe('cache TTL (24h)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('expires a cached translation once the TTL elapses', () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      useAITranslationStore.getState().setTranslation('m1', 'vi', 'hi', 'chào');
      expect(useAITranslationStore.getState().getTranslation('m1', 'vi')).not.toBeNull();

      jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
      expect(useAITranslationStore.getState().getTranslation('m1', 'vi')).toBeNull();
    });

    it('clearExpired drops expired entries but keeps fresh ones', () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      useAITranslationStore.getState().setTranslation('old', 'vi', 'a', 'A');

      jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
      useAITranslationStore.getState().setTranslation('fresh', 'vi', 'b', 'B');

      useAITranslationStore.getState().clearExpired();

      expect(useAITranslationStore.getState().cache.has('old_vi')).toBe(false);
      expect(useAITranslationStore.getState().cache.has('fresh_vi')).toBe(true);
    });
  });
});
