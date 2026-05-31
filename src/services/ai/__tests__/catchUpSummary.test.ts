import { runCatchUpSummary } from '../catchUpSummary';
import { catchUp } from '../aiConversationApi';
import { useAISummaryStore } from '../../../store/useAISummaryStore';

jest.mock('../aiConversationApi', () => ({
  catchUp: jest.fn(),
}));

const mockCatchUp = catchUp as jest.Mock;

const CONV = 'conv-1';

const result = (over: Partial<Parameters<typeof Object.assign>[0]> = {}) => ({
  hadUnread: true,
  summary: 'Tóm tắt nội dung',
  messageCount: 5,
  truncated: false,
  cached: false,
  generatedAt: 123,
  ...(over as object),
});

const store = () => useAISummaryStore.getState();

describe('runCatchUpSummary', () => {
  beforeEach(() => {
    mockCatchUp.mockReset();
    // Reset the shared store entries for this conversation.
    store().invalidate(CONV);
    store().setError(CONV, null);
    store().setLoading(CONV, false);
  });

  it('fetches via the catch-up endpoint exactly once (never posts into Zai)', async () => {
    mockCatchUp.mockResolvedValue(result());
    await runCatchUpSummary(CONV);
    expect(mockCatchUp).toHaveBeenCalledTimes(1);
    expect(mockCatchUp).toHaveBeenCalledWith(CONV);
  });

  it('stores the summary on success (hadUnread true) and clears loading', async () => {
    mockCatchUp.mockResolvedValue(result());
    await runCatchUpSummary(CONV);

    const cached = store().summaries.get(CONV);
    expect(cached?.summary).toBe('Tóm tắt nội dung');
    expect(cached?.messageCount).toBe(5);
    expect(store().isLoading(CONV)).toBe(false);
    expect(store().getError(CONV)).toBeNull();
  });

  it('stores an empty summary when hadUnread is false (modal shows no-unread)', async () => {
    mockCatchUp.mockResolvedValue(result({ hadUnread: false, summary: '' } as any));
    await runCatchUpSummary(CONV);

    const cached = store().summaries.get(CONV);
    expect(cached).toBeDefined();
    expect(cached?.summary).toBe('');
    expect(store().isLoading(CONV)).toBe(false);
  });

  it('appends a truncation note when the result is truncated', async () => {
    mockCatchUp.mockResolvedValue(result({ truncated: true } as any));
    await runCatchUpSummary(CONV);

    const cached = store().summaries.get(CONV);
    expect(cached?.summary).toContain('Tóm tắt nội dung');
    expect(cached?.summary).toContain('lược bớt');
  });

  it('does NOT append a truncation note when there is no summary text', async () => {
    mockCatchUp.mockResolvedValue(result({ hadUnread: false, summary: '', truncated: true } as any));
    await runCatchUpSummary(CONV);

    const cached = store().summaries.get(CONV);
    expect(cached?.summary).toBe('');
  });

  it('sets an error and clears loading when catchUp rejects', async () => {
    mockCatchUp.mockRejectedValue(new Error('boom'));
    await runCatchUpSummary(CONV);

    expect(store().getError(CONV)).toBe('boom');
    expect(store().isLoading(CONV)).toBe(false);
  });
});
