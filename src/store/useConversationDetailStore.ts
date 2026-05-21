import { create } from 'zustand';
import { getConversationDetail } from '../services/conversationsApi';
import type { GroupSettings } from '../types/group-settings';
import { normalizeGroupSettings } from '../types/group-settings';

export interface ConversationMember {
  id: string;
  userId: string;
  fullName: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  leftAt: string | null;
}

export interface ConversationDetail {
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatarUrl?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
  memberCount: number;
}

export interface MySettings {
  role: 'owner' | 'admin' | 'member';
  nickname?: string;
  isMuted?: boolean;
  isPinned?: boolean;
}

interface ConversationDetailState {
  cache: Record<string, {
    conversation: ConversationDetail;
    members: ConversationMember[];
    mySettings: MySettings;
    settings: GroupSettings | null;
    cachedAt: number;
  }>;
  isLoading: boolean;
  error: string | null;
  fetchConversationDetail: (conversationId: string, forceRefresh?: boolean) => Promise<void>;
  fetchConversationMembers: (conversationId: string) => Promise<void>;
  updateConversation: (conversationId: string, updates: Partial<ConversationDetail>) => void;
  updateMember: (conversationId: string, memberId: string, updates: Partial<ConversationMember>) => void;
  addMember: (conversationId: string, member: ConversationMember) => void;
  removeMember: (conversationId: string, memberId: string) => void;
  updateMySettings: (conversationId: string, updates: Partial<MySettings>) => void;
  updateSettings: (conversationId: string, settings: GroupSettings | null) => void;
  invalidateCache: (conversationId: string) => void;
  invalidateAllCache: () => void;
  getConversationDetail: (conversationId: string) => ConversationDetail | null;
  getMembers: (conversationId: string) => ConversationMember[];
  getMySettings: (conversationId: string) => MySettings | null;
  getSettings: (conversationId: string) => GroupSettings | null;
  reset: () => void;
}

const CACHE_TTL = 5 * 60 * 1000;

export const useConversationDetailStore = create<ConversationDetailState>((set, get) => ({
  cache: {},
  isLoading: false,
  error: null,

  fetchConversationDetail: async (conversationId: string, forceRefresh = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getConversationDetail(conversationId);
      const data = response.data?.data || response.data;
      if (!data) {
        set({ isLoading: false });
        return;
      }
      set((state) => {
        const existing = state.cache[conversationId];
        const now = Date.now();
        if (!forceRefresh && existing && now - existing.cachedAt < CACHE_TTL) {
          return { isLoading: false };
        }
        const conversation: ConversationDetail = {
          id: data.id,
          type: data.type,
          name: data.name,
          avatarUrl: data.avatarUrl,
          createdById: data.createdById,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          memberCount: data.memberCount || data.members?.length || 0,
        };
        const members: ConversationMember[] = (data.members || []).map((m: any) => ({
          id: m.id,
          userId: m.userId,
          fullName: m.fullName,
          nickname: m.nickname,
          avatarUrl: m.avatarUrl,
          role: m.role,
          joinedAt: m.joinedAt,
          leftAt: m.leftAt,
        }));
        const mySettings: MySettings = {
          role: data.mySettings?.role || 'member',
          nickname: data.mySettings?.nickname,
          isMuted: data.mySettings?.isMuted,
          isPinned: data.mySettings?.isPinned,
        };
        const settings: GroupSettings | null = data.settings ? normalizeGroupSettings(data.settings) : null;
        return {
          cache: {
            ...state.cache,
            [conversationId]: { conversation, members, mySettings, settings, cachedAt: now },
          },
          isLoading: false,
        };
      });
    } catch (err) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  fetchConversationMembers: async (conversationId: string) => {
    return get().fetchConversationDetail(conversationId);
  },

  updateConversation: (conversationId: string, updates: Partial<ConversationDetail>) => {
    set((state) => {
      const existing = state.cache[conversationId];
      if (!existing) return {};
      return {
        cache: {
          ...state.cache,
          [conversationId]: {
            ...existing,
            conversation: { ...existing.conversation, ...updates },
            cachedAt: Date.now(),
          },
        },
      };
    });
  },

  updateMember: (conversationId: string, memberId: string, updates: Partial<ConversationMember>) => {
    set((state) => {
      const existing = state.cache[conversationId];
      if (!existing) return {};
      return {
        cache: {
          ...state.cache,
          [conversationId]: {
            ...existing,
            members: existing.members.map((m) =>
              m.id === memberId || m.userId === memberId ? { ...m, ...updates } : m
            ),
            cachedAt: Date.now(),
          },
        },
      };
    });
  },

  addMember: (conversationId: string, member: ConversationMember) => {
    set((state) => {
      const existing = state.cache[conversationId];
      if (!existing) return {};
      return {
        cache: {
          ...state.cache,
          [conversationId]: {
            ...existing,
            members: [...existing.members, member],
            conversation: {
              ...existing.conversation,
              memberCount: existing.conversation.memberCount + 1,
            },
            cachedAt: Date.now(),
          },
        },
      };
    });
  },

  removeMember: (conversationId: string, memberId: string) => {
    set((state) => {
      const existing = state.cache[conversationId];
      if (!existing) return {};
      const filteredMembers = existing.members.filter((m) => m.id !== memberId && m.userId !== memberId);
      return {
        cache: {
          ...state.cache,
          [conversationId]: {
            ...existing,
            members: filteredMembers,
            conversation: {
              ...existing.conversation,
              memberCount: Math.max(0, existing.conversation.memberCount - 1),
            },
            cachedAt: Date.now(),
          },
        },
      };
    });
  },

  updateMySettings: (conversationId: string, updates: Partial<MySettings>) => {
    set((state) => {
      const existing = state.cache[conversationId];
      if (!existing) return {};
      return {
        cache: {
          ...state.cache,
          [conversationId]: {
            ...existing,
            mySettings: { ...existing.mySettings, ...updates },
            cachedAt: Date.now(),
          },
        },
      };
    });
  },

  updateSettings: (conversationId: string, settings: GroupSettings | null) => {
    set((state) => {
      const existing = state.cache[conversationId];
      if (!existing) return {};
      return {
        cache: {
          ...state.cache,
          [conversationId]: {
            ...existing,
            settings: settings ? normalizeGroupSettings(settings) : null,
            cachedAt: Date.now(),
          },
        },
      };
    });
  },

  invalidateCache: (conversationId: string) => {
    set((state) => {
      const newCache = { ...state.cache };
      delete newCache[conversationId];
      return { cache: newCache };
    });
  },

  invalidateAllCache: () => set({ cache: {} }),

  getConversationDetail: (conversationId: string) => get().cache[conversationId]?.conversation || null,

  getMembers: (conversationId: string) => get().cache[conversationId]?.members || [],

  getMySettings: (conversationId: string) => get().cache[conversationId]?.mySettings || null,

  getSettings: (conversationId: string) => get().cache[conversationId]?.settings || null,

  reset: () => set({ cache: {}, isLoading: false, error: null }),
}));
