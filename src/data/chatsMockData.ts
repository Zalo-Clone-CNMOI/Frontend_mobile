
export type MessageType = 'text' | 'image' | 'system';

export interface ConversationV2 {
  conversationId: string;
  isGroup: boolean;
  name?: string;
  avatar?: string;
  lastMessage: {
    content: string;
    type: MessageType;
    timestamp: number;
  };
  unreadCount: number;
  pinned: boolean;
  muted: boolean;
}

export const CHATS_V2: ConversationV2[] = [
  {
    conversationId: 'c-1',
    isGroup: false,
    name: 'Nguyễn Văn A',
    avatar: 'https://i.pravatar.cc/150?u=u1',
    lastMessage: { content: 'Sẵn sàng tối nay', type: 'text', timestamp: Date.now() - 1000 * 60 * 60 },
    unreadCount: 0,
    pinned: true,
    muted: false,
  },
  {
    conversationId: 'c-2',
    isGroup: false,
    name: 'Trần Thị B',
    avatar: 'https://i.pravatar.cc/150?u=u2',
    lastMessage: { content: 'Ảnh mới: IMG_1234.jpg', type: 'image', timestamp: Date.now() - 1000 * 60 * 30 },
    unreadCount: 3,
    pinned: false,
    muted: false,
  },
  {
    conversationId: 'g-1',
    isGroup: true,
    name: 'Nhóm Lập Trình',
    avatar: 'https://i.pravatar.cc/150?u=g1',
    lastMessage: { content: 'Minh: Đã xong phần thiết kế UI', type: 'text', timestamp: Date.now() - 1000 * 60 * 60 * 5 },
    unreadCount: 7,
    pinned: false,
    muted: true,
  },
  {
    conversationId: 'c-3',
    isGroup: false,
    name: 'Lê C',
    avatar: 'https://i.pravatar.cc/150?u=u3',
    lastMessage: { content: 'Ok luôn', type: 'text', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
    unreadCount: 0,
    pinned: false,
    muted: false,
  },
  {
    conversationId: 'g-2',
    isGroup: true,
    name: 'Family Chat',
    avatar: 'https://i.pravatar.cc/150?u=g2',
    lastMessage: { content: 'Mẹ: Tối nay ăn gì?', type: 'text', timestamp: Date.now() - 1000 * 60 * 60 * 2 },
    unreadCount: 1,
    pinned: false,
    muted: false,
  },
];
