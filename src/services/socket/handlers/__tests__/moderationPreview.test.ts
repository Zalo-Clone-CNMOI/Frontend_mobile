import { pickPreviewAfterRemoval } from '../moderationPreview';
import type { ChatMessage } from '@/src/types/chat';

const PLACEHOLDER = 'Tin nhắn đã bị gỡ bởi kiểm duyệt AI';

const msg = (over: Partial<ChatMessage>): ChatMessage =>
  ({
    id: 'x',
    conversationId: 'c1',
    type: 'text',
    text: '',
    timestamp: 0,
    ...over,
  } as ChatMessage);

describe('pickPreviewAfterRemoval', () => {
  it('returns null when the removed message is not loaded locally', () => {
    const messages = [msg({ id: 'a', text: 'hi', timestamp: 1 })];
    expect(pickPreviewAfterRemoval(messages, 'missing', PLACEHOLDER)).toBeNull();
  });

  it('recomputes to the newest still-visible message when the removed was the latest', () => {
    const messages = [
      msg({ id: 'a', text: 'older', timestamp: 1, senderId: 'u1', senderName: 'A' }),
      msg({ id: 'b', text: 'toxic', timestamp: 2, removed: true }), // already marked removed
    ];
    const update = pickPreviewAfterRemoval(messages, 'b', PLACEHOLDER);
    expect(update).toEqual({
      content: 'older',
      type: 'text',
      timestamp: 1,
      senderId: 'u1',
      senderName: 'A',
    });
  });

  it('matches the removed message by serverMessageId too', () => {
    const messages = [
      msg({ id: 'a', text: 'older', timestamp: 1 }),
      msg({ id: 'temp-b', serverMessageId: 'srv-b', text: 'toxic', timestamp: 2, removed: true }),
    ];
    const update = pickPreviewAfterRemoval(messages, 'srv-b', PLACEHOLDER);
    expect(update?.content).toBe('older');
  });

  it('is idempotent when the removed message was NOT the latest', () => {
    const messages = [
      msg({ id: 'a', text: 'older removed', timestamp: 1, removed: true }),
      msg({ id: 'b', text: 'newest', timestamp: 3 }),
    ];
    const update = pickPreviewAfterRemoval(messages, 'a', PLACEHOLDER);
    expect(update?.content).toBe('newest');
    expect(update?.timestamp).toBe(3);
  });

  it('falls back to a placeholder (keeping timestamp) when no visible message remains', () => {
    const messages = [msg({ id: 'only', text: 'toxic', timestamp: 5, removed: true })];
    const update = pickPreviewAfterRemoval(messages, 'only', PLACEHOLDER);
    expect(update).toEqual({ content: PLACEHOLDER, type: 'text', timestamp: 5 });
  });

  it('ignores revoked messages when picking the newest visible', () => {
    const messages = [
      msg({ id: 'a', text: 'kept', timestamp: 1 }),
      msg({ id: 'b', text: 'recalled', timestamp: 2, isRevoked: true }),
      msg({ id: 'c', text: 'toxic', timestamp: 3, removed: true }),
    ];
    const update = pickPreviewAfterRemoval(messages, 'c', PLACEHOLDER);
    expect(update?.content).toBe('kept');
  });
});
