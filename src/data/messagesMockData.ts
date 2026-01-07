import { ChatMessage } from '../types/chat';

export const MESSAGES_INITIAL_DATA: ChatMessage[] = [
  { id: 'm1', text: 'Chào bạn, mình có thể giúp gì?', fromMe: false, time: '09:00' },
  { id: 'm2', text: 'Mình đang làm app Zalo bằng Expo Router.', fromMe: true, time: '09:01' },
  { id: 'm3', text: 'Ok, mình gửi UI cơ bản nhé.', fromMe: false, time: '09:02' },
];

// Store messages by chat ID
export const MESSAGES_BY_CHAT_ID: Record<string, ChatMessage[]> = {
  '1': MESSAGES_INITIAL_DATA,
  '3': [
    { id: 'm1', text: 'Hey!', fromMe: true, time: '08:00' },
    { id: 'm2', text: 'How are you?', fromMe: false, time: '08:01' },
  ],
  // ... more messages for other chats
};
