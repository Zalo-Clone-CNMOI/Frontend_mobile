/**
 * chatService.ts
 *
 * Mock API service cho Chat: Conversations, Messages, Contacts.
 * Data mẫu phản ánh đúng shape các types ChatZaho đang dùng.
 *
 * Để chuyển sang backend thật: thay `mockFetch(...)` bằng `apiFetch('/endpoint')`.
 */

import { mockFetch } from './apiService';
import type { ChatMessage, ConversationV2 } from '../types/chat';
import type { UserV2 } from '../data/contactsMockData';

// ─────────────────────────────────────────────────────────────────────────────
// Sample Data – Conversations
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_CONVERSATIONS: ConversationV2[] = [
  {
    conversationId: 'conv_001',
    isGroup: false,
    name: 'Minh Tú',
    avatar: 'https://i.pravatar.cc/150?u=u6',
    lastMessage: {
      content: 'OK mình xem rồi 👍',
      type: 'text',
      timestamp: Date.now() - 1000 * 60 * 5,
    },
    unreadCount: 0,
    pinned: true,
    muted: false,
  },
  {
    conversationId: 'conv_002',
    isGroup: false,
    name: 'Quang Huy',
    avatar: 'https://i.pravatar.cc/150?u=u7',
    lastMessage: {
      content: '[Hình ảnh]',
      type: 'image',
      timestamp: Date.now() - 1000 * 60 * 30,
    },
    unreadCount: 2,
    pinned: false,
    muted: false,
  },
  {
    conversationId: 'conv_003',
    isGroup: true,
    name: 'Nhóm Dự Án Front-end',
    avatar: 'https://i.pravatar.cc/150?u=group1',
    lastMessage: {
      content: 'Tôi vừa đẩy code lên repo 🚀',
      type: 'text',
      timestamp: Date.now() - 1000 * 60 * 60 * 2,
    },
    unreadCount: 5,
    pinned: false,
    muted: false,
  },
  {
    conversationId: 'conv_004',
    isGroup: true,
    name: 'Gia Đình 🏠',
    avatar: 'https://i.pravatar.cc/150?u=group2',
    lastMessage: {
      content: 'Ai nấu cơm tối nay?',
      type: 'text',
      timestamp: Date.now() - 1000 * 60 * 60 * 5,
    },
    unreadCount: 0,
    pinned: true,
    muted: true,
  },
  {
    conversationId: 'conv_005',
    isGroup: false,
    name: 'Lan Anh',
    avatar: 'https://i.pravatar.cc/150?u=u8',
    lastMessage: {
      content: 'Nhớ gửi mình file tài liệu nhé',
      type: 'text',
      timestamp: Date.now() - 1000 * 60 * 60 * 24,
    },
    unreadCount: 1,
    pinned: false,
    muted: false,
  },
  {
    conversationId: 'conv_006',
    isGroup: false,
    name: 'Hải Đăng',
    avatar: 'https://i.pravatar.cc/150?u=u9',
    lastMessage: {
      content: 'Ngày mai họp lúc 9h sáng nha bạn',
      type: 'text',
      timestamp: Date.now() - 1000 * 60 * 60 * 48,
    },
    unreadCount: 0,
    pinned: false,
    muted: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sample Data – Messages per Conversation
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_MESSAGES: Record<string, ChatMessage[]> = {
  conv_001: [
    {
      id: 'msg_001',
      conversationId: 'conv_001',
      senderId: 'u6',
      fromMe: false,
      type: 'text',
      text: 'Chào bạn, hôm nay họp lúc mấy giờ? 😊',
      timestamp: Date.now() - 1000 * 60 * 30,
    },
    {
      id: 'msg_002',
      conversationId: 'conv_001',
      senderId: 'user-me',
      fromMe: true,
      type: 'text',
      text: '10h nhé, ở phòng họp tầng 3',
      timestamp: Date.now() - 1000 * 60 * 28,
      replyTo: {
        id: 'msg_001',
        senderName: 'Minh Tú',
        text: 'Chào bạn, hôm nay họp lúc mấy giờ? 😊',
      },
    },
    {
      id: 'msg_003',
      conversationId: 'conv_001',
      senderId: 'u6',
      fromMe: false,
      type: 'text',
      text: 'Ok, mình sẽ chuẩn bị slides trước nha',
      timestamp: Date.now() - 1000 * 60 * 25,
    },
    {
      id: 'msg_004',
      conversationId: 'conv_001',
      senderId: 'user-me',
      fromMe: true,
      type: 'image',
      text: 'Gửi bạn hình tài liệu UI design',
      fileInfo: {
        uri: 'https://picsum.photos/400/300?random=1',
        name: 'design_mockup.jpg',
        size: '240 KB',
        mimeType: 'image/jpeg',
      },
      timestamp: Date.now() - 1000 * 60 * 20,
    },
    {
      id: 'msg_005',
      conversationId: 'conv_001',
      senderId: 'u6',
      fromMe: false,
      type: 'file',
      text: 'Đây là file spec cho meeting',
      fileInfo: {
        name: 'project-spec.pdf',
        size: '1.2 MB',
        mimeType: 'application/pdf',
      },
      timestamp: Date.now() - 1000 * 60 * 15,
    },
    {
      id: 'msg_006',
      conversationId: 'conv_001',
      senderId: 'user-me',
      fromMe: true,
      type: 'text',
      text: 'OK mình xem rồi 👍',
      timestamp: Date.now() - 1000 * 60 * 5,
    },
  ],

  conv_002: [
    {
      id: 'msg_101',
      conversationId: 'conv_002',
      senderId: 'u7',
      fromMe: false,
      type: 'text',
      text: 'Hey, nay đi ăn trưa không? 🍜',
      timestamp: Date.now() - 1000 * 60 * 60,
    },
    {
      id: 'msg_102',
      conversationId: 'conv_002',
      senderId: 'user-me',
      fromMe: true,
      type: 'text',
      text: 'Ừ, đi thôi. 12h nhé',
      timestamp: Date.now() - 1000 * 60 * 58,
    },
    {
      id: 'msg_103',
      conversationId: 'conv_002',
      senderId: 'u7',
      fromMe: false,
      type: 'image',
      fileInfo: {
        uri: 'https://picsum.photos/400/300?random=2',
        name: 'photo_test.png',
        size: '345 KB',
        mimeType: 'image/png',
      },
      timestamp: Date.now() - 1000 * 60 * 30,
    },
    {
      id: 'msg_104',
      conversationId: 'conv_002',
      senderId: 'u7',
      fromMe: false,
      type: 'text',
      text: 'Quán này ngon lắm, thử đi 😋',
      timestamp: Date.now() - 1000 * 60 * 29,
    },
  ],

  conv_003: [
    {
      id: 'msg_201',
      conversationId: 'conv_003',
      senderId: 'u8',
      fromMe: false,
      type: 'text',
      text: 'Mọi người ơi, ai xong phần UI chưa?',
      timestamp: Date.now() - 1000 * 60 * 60 * 5,
    },
    {
      id: 'msg_202',
      conversationId: 'conv_003',
      senderId: 'u9',
      fromMe: false,
      type: 'text',
      text: 'Mình xong rồi, đang test thôi',
      timestamp: Date.now() - 1000 * 60 * 60 * 4,
    },
    {
      id: 'msg_203',
      conversationId: 'conv_003',
      senderId: 'user-me',
      fromMe: true,
      type: 'text',
      text: 'Mình đang làm phần chat screen, xong chiều nay',
      timestamp: Date.now() - 1000 * 60 * 60 * 3,
    },
    {
      id: 'msg_204',
      conversationId: 'conv_003',
      senderId: 'u9',
      fromMe: false,
      type: 'text',
      text: 'Tôi vừa đẩy code lên repo 🚀',
      timestamp: Date.now() - 1000 * 60 * 60 * 2,
    },
    {
      id: 'msg_205',
      conversationId: 'conv_003',
      senderId: 'u8',
      fromMe: false,
      type: 'text',
      text: 'Good job team! 💪',
      timestamp: Date.now() - 1000 * 60 * 60 * 2 + 30000,
      isRevoked: false,
    },
    {
      id: 'msg_206',
      conversationId: 'conv_003',
      senderId: 'u6',
      fromMe: false,
      type: 'text',
      text: 'Xin lỗi, mình thu hồi tin nhắn này',
      timestamp: Date.now() - 1000 * 60 * 60,
      isRevoked: true,
    },
  ],

  conv_004: [
    {
      id: 'msg_301',
      conversationId: 'conv_004',
      senderId: 'u6',
      fromMe: false,
      type: 'text',
      text: 'Ai nấu cơm tối nay? 🍚',
      timestamp: Date.now() - 1000 * 60 * 60 * 5,
    },
    {
      id: 'msg_302',
      conversationId: 'conv_004',
      senderId: 'user-me',
      fromMe: true,
      type: 'text',
      text: 'Để mình nấu, tối nay làm canh chua cá lóc nhé',
      timestamp: Date.now() - 1000 * 60 * 60 * 4.5,
    },
    {
      id: 'msg_303',
      conversationId: 'conv_004',
      senderId: 'u9',
      fromMe: false,
      type: 'text',
      text: 'Mình thích ăn canh chua lắm 😋',
      timestamp: Date.now() - 1000 * 60 * 60 * 4,
    },
  ],

  conv_005: [
    {
      id: 'msg_401',
      conversationId: 'conv_005',
      senderId: 'u8',
      fromMe: false,
      type: 'text',
      text: 'Nhớ gửi mình file tài liệu nhé',
      timestamp: Date.now() - 1000 * 60 * 60 * 24,
    },
    {
      id: 'msg_402',
      conversationId: 'conv_005',
      senderId: 'user-me',
      fromMe: true,
      type: 'text',
      text: 'Ok để mình tìm lại rồi gửi sau nha',
      timestamp: Date.now() - 1000 * 60 * 60 * 23,
    },
  ],

  conv_006: [
    {
      id: 'msg_501',
      conversationId: 'conv_006',
      senderId: 'u9',
      fromMe: false,
      type: 'text',
      text: 'Bạn ơi, ngày mai họp lúc 9h sáng nha bạn',
      timestamp: Date.now() - 1000 * 60 * 60 * 48,
    },
    {
      id: 'msg_502',
      conversationId: 'conv_006',
      senderId: 'user-me',
      fromMe: true,
      type: 'text',
      text: 'Ok, mình nhớ rồi, cảm ơn bạn nhé!',
      timestamp: Date.now() - 1000 * 60 * 60 * 47,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Sample Data – Users / Contacts
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_USERS: UserV2[] = [
  {
    id: 'user-me',
    fullName: 'Bạn (Me)',
    avatar: 'https://i.pravatar.cc/150?u=user-me',
    status: 'online',
    lastSeen: Date.now(),
  },
  {
    id: 'u6',
    fullName: 'Minh Tú',
    avatar: 'https://i.pravatar.cc/150?u=u6',
    status: 'online',
    lastSeen: Date.now() - 1000 * 60 * 3,
  },
  {
    id: 'u7',
    fullName: 'Quang Huy',
    avatar: 'https://i.pravatar.cc/150?u=u7',
    status: 'offline',
    lastSeen: Date.now() - 1000 * 60 * 15,
  },
  {
    id: 'u8',
    fullName: 'Lan Anh',
    avatar: 'https://i.pravatar.cc/150?u=u8',
    status: 'online',
    lastSeen: Date.now() - 1000 * 60 * 8,
  },
  {
    id: 'u9',
    fullName: 'Hải Đăng',
    avatar: 'https://i.pravatar.cc/150?u=u9',
    status: 'offline',
    lastSeen: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: 'u10',
    fullName: 'Phương Linh',
    avatar: 'https://i.pravatar.cc/150?u=u10',
    status: 'online',
    lastSeen: Date.now() - 1000 * 60 * 2,
  },
  {
    id: 'u11',
    fullName: 'Tuấn Kiệt',
    avatar: 'https://i.pravatar.cc/150?u=u11',
    status: 'offline',
    lastSeen: Date.now() - 1000 * 60 * 60 * 5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/conversations
 * Trả về danh sách cuộc hội thoại của current user.
 */
export async function fetchConversations(): Promise<ConversationV2[]> {
  // TODO: replace with → apiFetch<ConversationV2[]>('/conversations')
  return mockFetch(SAMPLE_CONVERSATIONS);
}

/**
 * GET /api/conversations/:conversationId/messages
 * Trả về danh sách tin nhắn trong một cuộc hội thoại.
 */
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  // TODO: replace with → apiFetch<ChatMessage[]>(`/conversations/${conversationId}/messages`)
  const messages = SAMPLE_MESSAGES[conversationId] ?? [];
  return mockFetch(messages);
}

/**
 * GET /api/conversations/:conversationId/messages (tất cả conversations)
 * Trả về toàn bộ messages group theo conversationId.
 */
export async function fetchAllMessages(): Promise<Record<string, ChatMessage[]>> {
  // TODO: replace with multiple API calls or a batch endpoint
  return mockFetch(SAMPLE_MESSAGES);
}

/**
 * GET /api/contacts
 * Trả về danh sách bạn bè / users.
 */
export async function fetchContacts(): Promise<{ users: UserV2[] }> {
  // TODO: replace with → apiFetch<{ users: UserV2[] }>('/contacts')
  return mockFetch({ users: SAMPLE_USERS });
}
