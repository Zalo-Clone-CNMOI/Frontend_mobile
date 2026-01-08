
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'system';

export interface MessageV2 {
  id: string;
  conversationId: string;
  senderId?: string;
  type: MessageType | 'system';
  content: string;
  createdAt: number;
  replyTo?: string; // messageId
  reactions?: Record<string, string[]>; // emoji -> userIds
  deletedFor?: string[];
  revoked?: boolean;
}

// Example read state (delivered/seen)
export interface MessageReadState {
  messageId: string;
  userId: string;
  deliveredAt: number;
  seenAt?: number;
}

// Production-like messages for multiple conversations
export const MESSAGES_V2: MessageV2[] = [
  {
    id: 'm1-c1',
    conversationId: 'c-1',
    senderId: 'u1',
    type: 'text',
    content: 'Sẵn sàng tối nay chứ?',
    createdAt: Date.now() - 1000 * 60 * 60,
  },
  {
    id: 'm2-c1',
    conversationId: 'c-1',
    senderId: 'user-me',
    type: 'text',
    content: 'Ok, gặp lúc 7 nhé.',
    createdAt: Date.now() - 1000 * 60 * 55,
    replyTo: 'm1-c1',
  },
  {
    id: 'm3-c1',
    conversationId: 'c-1',
    senderId: 'user-me',
    type: 'text',
    content: '👍',
    createdAt: Date.now() - 1000 * 60 * 55,
  },

  // Conversation c-2 with an image message and some unread
  {
    id: 'm1-c2',
    conversationId: 'c-2',
    senderId: 'u2',
    type: 'image',
    content: 'https://picsum.photos/400/300?random=1',
    createdAt: Date.now() - 1000 * 60 * 30,
  },

  // Group g-1 includes a system message and a revoked message
  {
    id: 'm1-g1',
    conversationId: 'g-1',
    type: 'text',
    content: 'Minh đã rời nhóm',
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
  },
  {
    id: 'm2-g1',
    conversationId: 'g-1',
    senderId: 'u3',
    type: 'text',
    content: 'Tôi vừa đẩy code lên repo',
    createdAt: Date.now() - 1000 * 60 * 60 * 5.5,
  },
  {
    id: 'm3-g1',
    conversationId: 'g-1',
    senderId: 'u2',
    type: 'text',
    content: 'Xin lỗi, mình thu hồi tin nhắn',
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    revoked: true,
  },

  // Family chat with a per-user deleted message
  {
    id: 'm1-g2',
    conversationId: 'g-2',
    senderId: 'u4',
    type: 'text',
    content: 'Ai nấu tối nay?',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    deletedFor: ['u3'],
  },
];

// Example read states
export const MESSAGES_READ_STATES: MessageReadState[] = [
  { messageId: 'm1-c1', userId: 'user-me', deliveredAt: Date.now() - 1000 * 60 * 59, seenAt: Date.now() - 1000 * 60 * 58 },
  { messageId: 'm1-c1', userId: 'u1', deliveredAt: Date.now() - 1000 * 60 * 59, seenAt: Date.now() - 1000 * 60 * 58 },
  { messageId: 'm2-c1', userId: 'u1', deliveredAt: Date.now() - 1000 * 60 * 54 },
];
