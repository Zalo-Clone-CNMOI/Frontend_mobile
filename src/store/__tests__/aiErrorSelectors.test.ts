import { useAISmartReplyStore } from '@/src/store/useAISmartReplyStore';
import { useAISummaryStore } from '@/src/store/useAISummaryStore';

// Issue #8 adds getError() to both stores. These stores had no test coverage,
// so we also exercise their full public surface here.

const resetSmart = () =>
  useAISmartReplyStore.setState({
    suggestions: new Map(),
    loadingByConversation: new Map(),
    errorByConversation: new Map(),
  });

const resetSummary = () =>
  useAISummaryStore.setState({
    summaries: new Map(),
    loadingByConversation: new Map(),
    errorByConversation: new Map(),
  });

describe('useAISmartReplyStore', () => {
  beforeEach(resetSmart);

  it('setSuggestions / getSuggestions round-trips, immutable, defaults to []', () => {
    expect(useAISmartReplyStore.getState().getSuggestions('c1')).toEqual([]);
    const before = useAISmartReplyStore.getState().suggestions;
    useAISmartReplyStore.getState().setSuggestions('c1', ['a', 'b']);
    expect(useAISmartReplyStore.getState().suggestions).not.toBe(before);
    expect(useAISmartReplyStore.getState().getSuggestions('c1')).toEqual(['a', 'b']);
  });

  it('clearSuggestions removes the conversation entry', () => {
    useAISmartReplyStore.getState().setSuggestions('c1', ['a']);
    useAISmartReplyStore.getState().clearSuggestions('c1');
    expect(useAISmartReplyStore.getState().getSuggestions('c1')).toEqual([]);
  });

  it('setLoading / isLoading toggles immutably', () => {
    const before = useAISmartReplyStore.getState().loadingByConversation;
    useAISmartReplyStore.getState().setLoading('c1', true);
    expect(useAISmartReplyStore.getState().loadingByConversation).not.toBe(before);
    expect(useAISmartReplyStore.getState().isLoading('c1')).toBe(true);
    useAISmartReplyStore.getState().setLoading('c1', false);
    expect(useAISmartReplyStore.getState().isLoading('c1')).toBe(false);
  });

  it('setError / getError stores then clears the error (Issue #8)', () => {
    expect(useAISmartReplyStore.getState().getError('c1')).toBeNull();
    useAISmartReplyStore.getState().setError('c1', 'engine down');
    expect(useAISmartReplyStore.getState().getError('c1')).toBe('engine down');
    useAISmartReplyStore.getState().setError('c1', null);
    expect(useAISmartReplyStore.getState().getError('c1')).toBeNull();
  });

  it('keys everything per conversation', () => {
    useAISmartReplyStore.getState().setError('c1', 'e1');
    useAISmartReplyStore.getState().setSuggestions('c2', ['x']);
    expect(useAISmartReplyStore.getState().getError('c2')).toBeNull();
    expect(useAISmartReplyStore.getState().getSuggestions('c1')).toEqual([]);
  });
});

describe('useAISummaryStore', () => {
  beforeEach(resetSummary);

  it('setSummary / getSummary round-trips immutably', () => {
    expect(useAISummaryStore.getState().getSummary('c1')).toBeNull();
    const before = useAISummaryStore.getState().summaries;
    useAISummaryStore.getState().setSummary('c1', 'a summary', 7);
    expect(useAISummaryStore.getState().summaries).not.toBe(before);
    const cached = useAISummaryStore.getState().getSummary('c1');
    expect(cached?.summary).toBe('a summary');
    expect(cached?.messageCount).toBe(7);
  });

  it('invalidate removes the cached summary', () => {
    useAISummaryStore.getState().setSummary('c1', 's', 1);
    useAISummaryStore.getState().invalidate('c1');
    expect(useAISummaryStore.getState().getSummary('c1')).toBeNull();
  });

  it('setLoading / isLoading toggles', () => {
    useAISummaryStore.getState().setLoading('c1', true);
    expect(useAISummaryStore.getState().isLoading('c1')).toBe(true);
    useAISummaryStore.getState().setLoading('c1', false);
    expect(useAISummaryStore.getState().isLoading('c1')).toBe(false);
  });

  it('setError / getError stores then clears the error (Issue #8)', () => {
    expect(useAISummaryStore.getState().getError('c1')).toBeNull();
    useAISummaryStore.getState().setError('c1', 'timeout');
    expect(useAISummaryStore.getState().getError('c1')).toBe('timeout');
    useAISummaryStore.getState().setError('c1', null);
    expect(useAISummaryStore.getState().getError('c1')).toBeNull();
  });

  describe('cache TTL (1h)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('getSummary expires the entry past the TTL', () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      useAISummaryStore.getState().setSummary('c1', 's', 1);
      expect(useAISummaryStore.getState().getSummary('c1')).not.toBeNull();
      jest.advanceTimersByTime(60 * 60 * 1000 + 1);
      expect(useAISummaryStore.getState().getSummary('c1')).toBeNull();
    });

    it('clearExpired drops expired summaries but keeps fresh ones', () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      useAISummaryStore.getState().setSummary('old', 's', 1);
      jest.advanceTimersByTime(60 * 60 * 1000 + 1);
      useAISummaryStore.getState().setSummary('fresh', 's', 1);
      useAISummaryStore.getState().clearExpired();
      expect(useAISummaryStore.getState().summaries.has('old')).toBe(false);
      expect(useAISummaryStore.getState().summaries.has('fresh')).toBe(true);
    });
  });
});
