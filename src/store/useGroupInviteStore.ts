import { create } from 'zustand';
import {
  getPendingInvites,
  getConversationInvites,
  acceptGroupInvite,
  rejectGroupInvite,
  cancelGroupInvite,
  GroupInviteDTO as Invite,
  GroupInviteStatus,
} from '../services/groupInviteApi';

interface GroupInviteState {
  // Received invites - invites the current user received (for inviteCenter)
  receivedInvites: {
    pending: Invite[];
    accepted: Invite[];
    rejected: Invite[];
    cancelled: Invite[];
    expired: Invite[];
  };
  
  // Sent invites - invites the current user sent (for groupInvite screen)
  sentInvites: {
    pending: Invite[];
    accepted: Invite[];
    rejected: Invite[];
    cancelled: Invite[];
    expired: Invite[];
  };
  
  // Metadata
  lastFetchedAt: number | null;
  unreadCount: number;
  isLoading: boolean;
  isSending: boolean; // For send invites loading state
  error: string | null;
  
  // Track processed socket event IDs for idempotency
  processedEventIds: Set<string>;

  // Actions
  fetchPendingInvites: (params?: {
    page?: number;
    limit?: number;
    status?: GroupInviteStatus;
    force?: boolean; // Force refresh even if cache is valid
  }) => Promise<void>;
  
  fetchConversationInvites: (conversationId: string, status?: GroupInviteStatus) => Promise<void>;
  
  // Send invites (API only, no optimistic update needed as recipient receives via socket)
  markSending: (isSending: boolean) => void;
  
  // Response actions (accept/reject/cancel)
  acceptInvite: (conversationId: string, inviteId: string) => Promise<void>;
  rejectInvite: (conversationId: string, inviteId: string) => Promise<void>;
  cancelInvite: (conversationId: string, inviteId: string) => Promise<void>;
  
  // Socket event handlers - with idempotency check
  handleInviteSent: (invite: Invite, eventId?: string) => void;
  handleInviteAccepted: (inviteId: string, respondedAt: string, eventId?: string) => void;
  handleInviteRejected: (inviteId: string, respondedAt: string, eventId?: string) => void;
  handleInviteCancelled: (inviteId: string, cancelledAt: string, eventId?: string) => void;
  handleInviteExpired: (inviteId: string, expiredAt: string, eventId?: string) => void;
  
  // Utility
  isEventProcessed: (eventId: string) => boolean;
  markEventProcessed: (eventId: string) => void;
  getInviteById: (inviteId: string) => Invite | undefined;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  reset: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useGroupInviteStore = create<GroupInviteState>((set, get) => ({
  receivedInvites: {
    pending: [],
    accepted: [],
    rejected: [],
    cancelled: [],
    expired: [],
  },
  sentInvites: {
    pending: [],
    accepted: [],
    rejected: [],
    cancelled: [],
    expired: [],
  },
  lastFetchedAt: null,
  unreadCount: 0,
  isLoading: false,
  isSending: false,
  error: null,
  processedEventIds: new Set<string>(),

  // Idempotency helpers
  isEventProcessed: (eventId: string) => {
    return get().processedEventIds.has(eventId);
  },
  
  markEventProcessed: (eventId: string) => {
    set((state) => {
      const newSet = new Set(state.processedEventIds);
      newSet.add(eventId);
      // Keep only last 100 event IDs to prevent memory leak
      if (newSet.size > 100) {
        const iterator = newSet.values();
        const firstValue = iterator.next().value;
        if (firstValue) {
          newSet.delete(firstValue);
        }
      }
      return { processedEventIds: newSet };
    });
  },

  getInviteById: (inviteId: string) => {
    const state = get();
    // Search in both received and sent invites
    return state.receivedInvites.pending.find((i) => i.id === inviteId) ||
           state.receivedInvites.accepted.find((i) => i.id === inviteId) ||
           state.receivedInvites.rejected.find((i) => i.id === inviteId) ||
           state.receivedInvites.cancelled.find((i) => i.id === inviteId) ||
           state.receivedInvites.expired.find((i) => i.id === inviteId) ||
           state.sentInvites.pending.find((i) => i.id === inviteId) ||
           state.sentInvites.accepted.find((i) => i.id === inviteId) ||
           state.sentInvites.rejected.find((i) => i.id === inviteId) ||
           state.sentInvites.cancelled.find((i) => i.id === inviteId) ||
           state.sentInvites.expired.find((i) => i.id === inviteId);
  },

  fetchPendingInvites: async (params) => {
    const { force } = params || {};
    const state = get();
    
    // Check cache validity unless force refresh
    if (!force && state.lastFetchedAt && Date.now() - state.lastFetchedAt < CACHE_TTL) {
      console.log('[useGroupInviteStore] Using cached invites');
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await getPendingInvites(params);
      const invites = response.data?.items || [];
      
      set((state) => {
        const now = Date.now();

        // Categorize invites by status - update receivedInvites
        const pending = invites.filter((i: Invite) => i.status === 'pending');
        const accepted = invites.filter((i: Invite) => i.status === 'accepted');
        const rejected = invites.filter((i: Invite) => i.status === 'rejected');
        const cancelled = invites.filter((i: Invite) => i.status === 'cancelled');
        const expired = invites.filter((i: Invite) => i.status === 'expired');

        return {
          receivedInvites: {
            pending,
            accepted,
            rejected,
            cancelled,
            expired,
          },
          lastFetchedAt: now,
          unreadCount: pending.length,
          isLoading: false,
        };
      });
    } catch (err) {
      console.error('[useGroupInviteStore] fetchPendingInvites error:', err);
      set({ error: String(err), isLoading: false });
    }
  },

  markSending: (isSending: boolean) => {
    set({ isSending });
  },

  fetchConversationInvites: async (conversationId: string, status: GroupInviteStatus = 'pending') => {
    set({ isLoading: true, error: null });
    try {
      const response = await getConversationInvites(conversationId, { status });
      const invites = response.data?.items || [];
      console.log('[useGroupInviteStore] fetchConversationInvites response:', invites);
      
      set((state) => {
        // Categorize invites by status - update sentInvites
        const pending = invites.filter((i: Invite) => i.status === 'pending');
        const accepted = invites.filter((i: Invite) => i.status === 'accepted');
        const rejected = invites.filter((i: Invite) => i.status === 'rejected');
        const cancelled = invites.filter((i: Invite) => i.status === 'cancelled');
        const expired = invites.filter((i: Invite) => i.status === 'expired');

        console.log('[useGroupInviteStore] Categorized sent invites:', { pending, accepted, rejected, cancelled, expired });

        return {
          sentInvites: {
            pending,
            accepted,
            rejected,
            cancelled,
            expired,
          },
          isLoading: false,
        };
      });
    } catch (err) {
      console.error('[useGroupInviteStore] fetchConversationInvites error:', err);
      set({ error: String(err), isLoading: false });
    }
  },

  // API Actions with optimistic updates
  acceptInvite: async (conversationId: string, inviteId: string) => {
    const state = get();
    const invite = state.receivedInvites.pending.find((i) => i.id === inviteId);
    if (!invite) {
      throw new Error('Invite not found in pending list');
    }

    // Optimistic update - update receivedInvites
    const updatedInvite: Invite = { 
      ...invite, 
      status: 'accepted', 
      respondedAt: new Date().toISOString() 
    };
    
    set((state) => ({
      receivedInvites: {
        ...state.receivedInvites,
        pending: state.receivedInvites.pending.filter((i) => i.id !== inviteId),
        accepted: [updatedInvite, ...state.receivedInvites.accepted],
      },
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      await acceptGroupInvite(conversationId, inviteId);
    } catch (err) {
      // Rollback on error
      set((state) => ({
        receivedInvites: {
          ...state.receivedInvites,
          pending: [invite, ...state.receivedInvites.pending],
          accepted: state.receivedInvites.accepted.filter((i) => i.id !== inviteId),
        },
        unreadCount: state.unreadCount + 1,
        error: String(err),
      }));
      throw err;
    }
  },

  rejectInvite: async (conversationId: string, inviteId: string) => {
    const state = get();
    const invite = state.receivedInvites.pending.find((i) => i.id === inviteId);
    if (!invite) {
      throw new Error('Invite not found in pending list');
    }

    // Optimistic update - update receivedInvites
    const updatedInvite: Invite = { 
      ...invite, 
      status: 'rejected', 
      respondedAt: new Date().toISOString() 
    };
    
    set((state) => ({
      receivedInvites: {
        ...state.receivedInvites,
        pending: state.receivedInvites.pending.filter((i) => i.id !== inviteId),
        rejected: [updatedInvite, ...state.receivedInvites.rejected],
      },
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      await rejectGroupInvite(conversationId, inviteId);
    } catch (err) {
      // Rollback on error
      set((state) => ({
        receivedInvites: {
          ...state.receivedInvites,
          pending: [invite, ...state.receivedInvites.pending],
          rejected: state.receivedInvites.rejected.filter((i) => i.id !== inviteId),
        },
        unreadCount: state.unreadCount + 1,
        error: String(err),
      }));
      throw err;
    }
  },

  cancelInvite: async (conversationId: string, inviteId: string) => {
    const state = get();
    const invite = state.sentInvites.pending.find((i) => i.id === inviteId);
    if (!invite) {
      throw new Error('Invite not found in pending list');
    }

    // Optimistic update - update sentInvites
    const updatedInvite: Invite = { 
      ...invite, 
      status: 'cancelled', 
      respondedAt: new Date().toISOString() 
    };
    
    set((state) => ({
      sentInvites: {
        ...state.sentInvites,
        pending: state.sentInvites.pending.filter((i) => i.id !== inviteId),
        cancelled: [updatedInvite, ...state.sentInvites.cancelled],
      },
    }));

    try {
      await cancelGroupInvite(conversationId, inviteId);
    } catch (err) {
      // Rollback on error
      set((state) => ({
        sentInvites: {
          ...state.sentInvites,
          pending: [invite, ...state.sentInvites.pending],
          cancelled: state.sentInvites.cancelled.filter((i) => i.id !== inviteId),
        },
        error: String(err),
      }));
      throw err;
    }
  },

  // Socket Event Handlers - with idempotency
  handleInviteSent: (invite: Invite, eventId?: string) => {
    // Check idempotency
    if (eventId && get().isEventProcessed(eventId)) {
      console.log('[useGroupInviteStore] Duplicate event ignored:', eventId);
      return;
    }
    if (eventId) {
      get().markEventProcessed(eventId);
    }

    set((state) => {
      // This event is for the recipient (user who received the invite)
      // Update receivedInvites only
      if (state.receivedInvites.pending.some((i) => i.id === invite.id)) {
        console.log('[useGroupInviteStore] Invite already exists in received:', invite.id);
        return {};
      }

      return {
        receivedInvites: {
          ...state.receivedInvites,
          pending: [invite, ...state.receivedInvites.pending],
        },
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  handleInviteAccepted: (inviteId: string, respondedAt: string, eventId?: string) => {
    if (eventId && get().isEventProcessed(eventId)) {
      console.log('[useGroupInviteStore] Duplicate event ignored:', eventId);
      return;
    }
    if (eventId) {
      get().markEventProcessed(eventId);
    }

    set((state) => {
      // Update receivedInvites (if user received this invite)
      const receivedInvite = state.receivedInvites.pending.find((i) => i.id === inviteId);
      if (receivedInvite) {
        const updatedInvite: Invite = { 
          ...receivedInvite, 
          status: 'accepted', 
          respondedAt 
        };
        return {
          receivedInvites: {
            ...state.receivedInvites,
            pending: state.receivedInvites.pending.filter((i) => i.id !== inviteId),
            accepted: [updatedInvite, ...state.receivedInvites.accepted],
          },
          unreadCount: Math.max(0, state.unreadCount - 1),
        };
      }

      // Update sentInvites (if user sent this invite)
      const sentInvite = state.sentInvites.pending.find((i) => i.id === inviteId);
      if (sentInvite) {
        const updatedInvite: Invite = { 
          ...sentInvite, 
          status: 'accepted', 
          respondedAt 
        };
        return {
          sentInvites: {
            ...state.sentInvites,
            pending: state.sentInvites.pending.filter((i) => i.id !== inviteId),
            accepted: [updatedInvite, ...state.sentInvites.accepted],
          },
        };
      }

      return {};
    });
  },

  handleInviteRejected: (inviteId: string, respondedAt: string, eventId?: string) => {
    if (eventId && get().isEventProcessed(eventId)) {
      console.log('[useGroupInviteStore] Duplicate event ignored:', eventId);
      return;
    }
    if (eventId) {
      get().markEventProcessed(eventId);
    }

    set((state) => {
      // Update receivedInvites (if user received this invite)
      const receivedInvite = state.receivedInvites.pending.find((i) => i.id === inviteId);
      if (receivedInvite) {
        const updatedInvite: Invite = { 
          ...receivedInvite, 
          status: 'rejected', 
          respondedAt 
        };
        return {
          receivedInvites: {
            ...state.receivedInvites,
            pending: state.receivedInvites.pending.filter((i) => i.id !== inviteId),
            rejected: [updatedInvite, ...state.receivedInvites.rejected],
          },
          unreadCount: Math.max(0, state.unreadCount - 1),
        };
      }

      // Update sentInvites (if user sent this invite)
      const sentInvite = state.sentInvites.pending.find((i) => i.id === inviteId);
      if (sentInvite) {
        const updatedInvite: Invite = { 
          ...sentInvite, 
          status: 'rejected', 
          respondedAt 
        };
        return {
          sentInvites: {
            ...state.sentInvites,
            pending: state.sentInvites.pending.filter((i) => i.id !== inviteId),
            rejected: [updatedInvite, ...state.sentInvites.rejected],
          },
        };
      }

      return {};
    });
  },

  handleInviteCancelled: (inviteId: string, cancelledAt: string, eventId?: string) => {
    if (eventId && get().isEventProcessed(eventId)) {
      console.log('[useGroupInviteStore] Duplicate event ignored:', eventId);
      return;
    }
    if (eventId) {
      get().markEventProcessed(eventId);
    }

    set((state) => {
      // Update receivedInvites (if user received this invite)
      const receivedInvite = state.receivedInvites.pending.find((i) => i.id === inviteId);
      if (receivedInvite) {
        const updatedInvite: Invite = { 
          ...receivedInvite, 
          status: 'cancelled', 
          respondedAt: cancelledAt 
        };
        return {
          receivedInvites: {
            ...state.receivedInvites,
            pending: state.receivedInvites.pending.filter((i) => i.id !== inviteId),
            cancelled: [updatedInvite, ...state.receivedInvites.cancelled],
          },
          unreadCount: Math.max(0, state.unreadCount - 1),
        };
      }

      // Update sentInvites (if user sent this invite)
      const sentInvite = state.sentInvites.pending.find((i) => i.id === inviteId);
      if (sentInvite) {
        const updatedInvite: Invite = { 
          ...sentInvite, 
          status: 'cancelled', 
          respondedAt: cancelledAt 
        };
        return {
          sentInvites: {
            ...state.sentInvites,
            pending: state.sentInvites.pending.filter((i) => i.id !== inviteId),
            cancelled: [updatedInvite, ...state.sentInvites.cancelled],
          },
        };
      }

      return {};
    });
  },

  handleInviteExpired: (inviteId: string, expiredAt: string, eventId?: string) => {
    if (eventId && get().isEventProcessed(eventId)) {
      console.log('[useGroupInviteStore] Duplicate event ignored:', eventId);
      return;
    }
    if (eventId) {
      get().markEventProcessed(eventId);
    }

    set((state) => {
      // Update receivedInvites (if user received this invite)
      const receivedInvite = state.receivedInvites.pending.find((i) => i.id === inviteId);
      if (receivedInvite) {
        const updatedInvite: Invite = { 
          ...receivedInvite, 
          status: 'expired', 
          respondedAt: expiredAt 
        };
        return {
          receivedInvites: {
            ...state.receivedInvites,
            pending: state.receivedInvites.pending.filter((i) => i.id !== inviteId),
            expired: [updatedInvite, ...state.receivedInvites.expired],
          },
          unreadCount: Math.max(0, state.unreadCount - 1),
        };
      }

      // Update sentInvites (if user sent this invite)
      const sentInvite = state.sentInvites.pending.find((i) => i.id === inviteId);
      if (sentInvite) {
        const updatedInvite: Invite = { 
          ...sentInvite, 
          status: 'expired', 
          respondedAt: expiredAt 
        };
        return {
          sentInvites: {
            ...state.sentInvites,
            pending: state.sentInvites.pending.filter((i) => i.id !== inviteId),
            expired: [updatedInvite, ...state.sentInvites.expired],
          },
        };
      }

      return {};
    });
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: Math.max(0, count) });
  },

  incrementUnreadCount: () => {
    set((state) => ({
      unreadCount: state.unreadCount + 1,
    }));
  },

  reset: () => {
    set({
      receivedInvites: {
        pending: [],
        accepted: [],
        rejected: [],
        cancelled: [],
        expired: [],
      },
      sentInvites: {
        pending: [],
        accepted: [],
        rejected: [],
        cancelled: [],
        expired: [],
      },
      lastFetchedAt: null,
      unreadCount: 0,
      isLoading: false,
      isSending: false,
      error: null,
      processedEventIds: new Set(),
    });
  },
}));
