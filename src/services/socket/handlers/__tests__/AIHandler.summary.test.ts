import { AIHandler } from '../AIHandler';
import { WsEvents } from '@/src/realtime/events';

const mockSetSummary = jest.fn();
const mockSetLoading = jest.fn();

jest.mock('@/src/store/useAISummaryStore', () => ({
  useAISummaryStore: {
    getState: () => ({ setSummary: mockSetSummary, setLoading: mockSetLoading }),
  },
}));

// handleSummaryResult is private; reach it through the public event router.
const dispatchSummary = (payload: unknown) => {
  const handler = new AIHandler();
  // createHandler is protected; reach it via an unknown cast for an isolated unit test.
  (handler as unknown as { createHandler: (e: string) => (p: unknown) => void })
    .createHandler(WsEvents.AiSummaryResult)(payload);
};

describe('AIHandler.handleSummaryResult (Issue #6)', () => {
  beforeEach(() => {
    mockSetSummary.mockReset();
    mockSetLoading.mockReset();
  });

  it('reads message_range.count from the wire and forwards it as messageCount', () => {
    dispatchSummary({
      conversation_id: 'c1',
      summary: 'A summary',
      message_range: { from_message_id: 'm1', to_message_id: 'm9', count: 7 },
      cached: false,
    });

    expect(mockSetSummary).toHaveBeenCalledWith('c1', 'A summary', 7);
    expect(mockSetLoading).toHaveBeenCalledWith('c1', false);
  });

  it('defaults count to 0 when message_range is absent (defensive)', () => {
    dispatchSummary({ conversation_id: 'c1', summary: 'x' });
    expect(mockSetSummary).toHaveBeenCalledWith('c1', 'x', 0);
  });

  it('ignores a payload without conversation_id', () => {
    dispatchSummary({ summary: 'orphan' });
    expect(mockSetSummary).not.toHaveBeenCalled();
    expect(mockSetLoading).not.toHaveBeenCalled();
  });
});
