import { SearchResult } from '../types/search';

// Legacy search results used by current UI
// Legacy search mock removed — use `SEARCH_V2` for search results.

// Zalo v2 search results (users + conversations)
export interface SearchResultUser {
  type: 'user';
  id: string;
  fullName: string;
  avatar?: string;
}

export interface SearchResultConversation {
  type: 'conversation';
  conversationId: string;
  name?: string;
  avatar?: string;
}

export const SEARCH_V2 = {
  users: [
    { type: 'user', id: 'u1', fullName: 'Nguyễn Văn A', avatar: 'https://i.pravatar.cc/150?u=u1' },
    { type: 'user', id: 'u3', fullName: 'Lê Công', avatar: 'https://i.pravatar.cc/150?u=u3' },
  ],
  conversations: [
    { type: 'conversation', conversationId: 'c-1', name: 'Nguyễn Văn A', avatar: 'https://i.pravatar.cc/150?u=u1' },
    { type: 'conversation', conversationId: 'g-1', name: 'Nhóm Lập Trình', avatar: 'https://i.pravatar.cc/150?u=g1' },
  ],
};
