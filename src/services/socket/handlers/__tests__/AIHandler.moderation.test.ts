import { AIHandler } from '../AIHandler';
import { WsEvents } from '@/src/realtime/events';
import { toast } from '@/src/services/toastService';

jest.mock('@/src/services/toastService', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const mockInfo = toast.info as jest.Mock;

const FLAG_NOTICE = 'Tin nhắn của bạn có thể vi phạm tiêu chuẩn cộng đồng.';

const dispatchModeration = (payload: unknown) => {
  const handler = new AIHandler();
  // createHandler is protected; reach it via an unknown cast for an isolated unit test.
  (handler as unknown as { createHandler: (e: string) => (p: unknown) => void })
    .createHandler(WsEvents.AiModerationResult)(payload);
};

describe('AIHandler.handleModerationResult (Issue #12)', () => {
  beforeEach(() => mockInfo.mockReset());

  it('notifies the sender when their message is flagged', () => {
    dispatchModeration({
      message_id: 'm1',
      conversation_id: 'c1',
      is_flagged: true,
      labels: ['toxic'],
      confidence: 0.9,
    });
    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(mockInfo).toHaveBeenCalledWith(FLAG_NOTICE);
  });

  it('does NOT notify when the result is not flagged', () => {
    dispatchModeration({
      message_id: 'm1',
      conversation_id: 'c1',
      is_flagged: false,
      labels: [],
      confidence: 0.1,
    });
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it('ignores payloads missing message_id or conversation_id', () => {
    dispatchModeration({ conversation_id: 'c1', is_flagged: true, labels: [], confidence: 1 });
    dispatchModeration({ message_id: 'm1', is_flagged: true, labels: [], confidence: 1 });
    expect(mockInfo).not.toHaveBeenCalled();
  });
});
