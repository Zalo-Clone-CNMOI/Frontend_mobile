import { useZaiChatStore } from '../useZaiChatStore';

const reset = () =>
  useZaiChatStore.setState({
    zaiTypingByConversation: new Map(),
    streamingMessagesByConversation: new Map(),
  });

describe('useZaiChatStore — immutable stream updates (Issue #9)', () => {
  beforeEach(reset);

  it('addStreamChunk creates new Map AND new nested StreamingMessage references', () => {
    useZaiChatStore.getState().addStreamChunk('c1', 'm1', 'Hello');
    const map1 = useZaiChatStore.getState().streamingMessagesByConversation;
    const msg1 = map1.get('c1');

    useZaiChatStore.getState().addStreamChunk('c1', 'm1', ' world');
    const map2 = useZaiChatStore.getState().streamingMessagesByConversation;
    const msg2 = map2.get('c1');

    expect(map2).not.toBe(map1); // new top-level Map
    expect(msg2).not.toBe(msg1); // new nested object — the core fix
    expect(msg2!.chunks).not.toBe(msg1!.chunks); // new array, not mutated in place
    expect(useZaiChatStore.getState().getStreamingText('c1')).toBe('Hello world');
  });

  it('starts a fresh stream when the messageId differs', () => {
    useZaiChatStore.getState().addStreamChunk('c1', 'm1', 'A');
    useZaiChatStore.getState().addStreamChunk('c1', 'm2', 'B');
    expect(useZaiChatStore.getState().getStreamingText('c1')).toBe('B');
  });

  it('completeStream sets complete via a new reference and stops isStreamActive', () => {
    useZaiChatStore.getState().addStreamChunk('c1', 'm1', 'hi');
    const before = useZaiChatStore
      .getState()
      .streamingMessagesByConversation.get('c1');
    expect(useZaiChatStore.getState().isStreamActive('c1')).toBe(true);

    useZaiChatStore.getState().completeStream('c1', 'm1');
    const after = useZaiChatStore
      .getState()
      .streamingMessagesByConversation.get('c1');

    expect(after).not.toBe(before); // immutable
    expect(after!.complete).toBe(true);
    expect(useZaiChatStore.getState().isStreamActive('c1')).toBe(false);
  });

  it('getStreamingText returns null for unknown conversation; clearStreaming removes it', () => {
    expect(useZaiChatStore.getState().getStreamingText('none')).toBeNull();
    useZaiChatStore.getState().addStreamChunk('c1', 'm1', 'x');
    useZaiChatStore.getState().clearStreaming('c1');
    expect(useZaiChatStore.getState().getStreamingText('c1')).toBeNull();
  });

  it('setZaiTyping toggles and isZaiTyping reflects it', () => {
    useZaiChatStore.getState().setZaiTyping('c1', true);
    expect(useZaiChatStore.getState().isZaiTyping('c1')).toBe(true);
    useZaiChatStore.getState().setZaiTyping('c1', false);
    expect(useZaiChatStore.getState().isZaiTyping('c1')).toBe(false);
  });
});
