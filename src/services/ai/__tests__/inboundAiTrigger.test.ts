import { triggerInboundAiFeatures } from '../inboundAiTrigger';

// Deferred via closures so the jest.mock factories (hoisted above imports) read
// the spies at call time, after these consts initialize.
const mockInvalidate = jest.fn();
const mockRequestSmartReply = jest.fn();

jest.mock('@/src/store/useAISummaryStore', () => ({
  useAISummaryStore: { getState: () => ({ invalidate: mockInvalidate }) },
}));
jest.mock('@/src/services/ai/SmartReplyService', () => ({
  smartReplyService: { requestSmartReply: (opts: unknown) => mockRequestSmartReply(opts) },
}));

describe('triggerInboundAiFeatures (Issue #11)', () => {
  beforeEach(() => {
    mockInvalidate.mockReset();
    mockRequestSmartReply.mockReset();
  });

  it('invalidates the summary and requests smart reply for an inbound (non-self) message', async () => {
    await triggerInboundAiFeatures({
      conversationId: 'c1',
      senderId: 'other-user',
      isSelf: false,
      currentUserId: 'me',
    });
    expect(mockInvalidate).toHaveBeenCalledWith('c1');
    expect(mockRequestSmartReply).toHaveBeenCalledTimes(1);
    expect(mockRequestSmartReply).toHaveBeenCalledWith({ conversationId: 'c1', userId: 'me' });
  });

  it('does nothing for a self-authored message', async () => {
    await triggerInboundAiFeatures({
      conversationId: 'c1',
      senderId: 'me',
      isSelf: true,
      currentUserId: 'me',
    });
    expect(mockInvalidate).not.toHaveBeenCalled();
    expect(mockRequestSmartReply).not.toHaveBeenCalled();
  });

  it('does nothing when conversationId is missing', async () => {
    await triggerInboundAiFeatures({
      conversationId: '',
      senderId: 'other-user',
      isSelf: false,
      currentUserId: 'me',
    });
    expect(mockRequestSmartReply).not.toHaveBeenCalled();
  });

  it('does nothing when senderId is missing', async () => {
    await triggerInboundAiFeatures({
      conversationId: 'c1',
      senderId: '',
      isSelf: false,
      currentUserId: 'me',
    });
    expect(mockRequestSmartReply).not.toHaveBeenCalled();
  });

  it('swallows requestSmartReply failures so the message pipeline never breaks', async () => {
    mockRequestSmartReply.mockRejectedValue(new Error('socket down'));
    await expect(
      triggerInboundAiFeatures({
        conversationId: 'c1',
        senderId: 'other-user',
        isSelf: false,
        currentUserId: 'me',
      }),
    ).resolves.toBeUndefined();
    // invalidate still ran (before the failing request).
    expect(mockInvalidate).toHaveBeenCalledWith('c1');
  });
});
