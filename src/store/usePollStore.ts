import { create } from 'zustand';
import {
  createPoll,
  listPolls,
  getPollDetail,
  editPoll,
  castVote,
  retractVote,
  addPollOption,
  removePollOption,
  closePoll,
  validateCreatePoll,
  validateEditPoll,
  validateVote,
  canEditPoll,
  canClosePoll,
  canAddOption,
  canRemoveOption,
  isPollExpired,
  formatExpiryCountdown,
} from '../services/pollsApi';
import {
  PollDetail,
  PollListItem,
  PollMessageMetadata,
  PollStatus,
  CreatePollRequestDTO,
  EditPollRequestDTO,
  VoteRequestDTO,
  AddPollOptionRequestDTO,
} from '../types/dto/PollDTO';
import {
  GroupPollCreatedPayload,
  GroupPollEditedPayload,
  GroupPollVoteUpdatedPayload,
  GroupPollOptionAddedPayload,
  GroupPollOptionRemovedPayload,
  GroupPollClosedPayload,
} from '../realtime/events';

interface PollState {
  // Polls by conversation
  pollsByConversation: Map<string, PollListItem[]>;
  
  // Detailed poll cache
  pollDetails: Map<string, PollDetail>;
  
  // Poll metadata embedded in chat messages (for rendering poll cards)
  pollMetadata: Map<string, PollMessageMetadata>;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isVoting: boolean;
  
  // Error state
  error: string | null;
  
  // Current user votes (pollId -> optionIds[])
  userVotes: Map<string, string[]>;
  
  // Track processed socket event IDs
  processedEventIds: Map<string, number>;
  
  // ==================== Actions ====================
  
  // API Actions
  createPoll: (conversationId: string, payload: CreatePollRequestDTO) => Promise<{ pollId: string; messageId: string }>;
  fetchPolls: (conversationId: string, params?: { status?: 'active' | 'closed'; page?: number; limit?: number }) => Promise<void>;
  fetchPollDetail: (conversationId: string, pollId: string, force?: boolean) => Promise<PollDetail | null>;
  editPoll: (conversationId: string, pollId: string, payload: EditPollRequestDTO) => Promise<void>;
  castVote: (conversationId: string, pollId: string, optionIds: string[]) => Promise<void>;
  retractVote: (conversationId: string, pollId: string) => Promise<void>;
  addOption: (conversationId: string, pollId: string, label: string) => Promise<void>;
  removeOption: (conversationId: string, pollId: string, optionId: string) => Promise<void>;
  closePoll: (conversationId: string, pollId: string) => Promise<void>;
  
  // Socket Event Handlers
  handlePollCreated: (payload: GroupPollCreatedPayload, eventId?: string) => void;
  handlePollEdited: (payload: GroupPollEditedPayload, eventId?: string) => void;
  handlePollVoteUpdated: (payload: GroupPollVoteUpdatedPayload, eventId?: string) => void;
  handlePollOptionAdded: (payload: GroupPollOptionAddedPayload, eventId?: string) => void;
  handlePollOptionRemoved: (payload: GroupPollOptionRemovedPayload, eventId?: string) => void;
  handlePollClosed: (payload: GroupPollClosedPayload, eventId?: string) => void;
  
  // Utility
  getPollById: (pollId: string) => PollDetail | PollMessageMetadata | undefined;
  getPollsForConversation: (conversationId: string) => PollListItem[];
  hasUserVoted: (pollId: string, optionId?: string) => boolean;
  getSelectedOptions: (pollId: string) => string[];
  canUserEdit: (pollId: string, userId: string) => boolean;
  canUserClose: (pollId: string, userId: string, userRole?: 'owner' | 'admin' | 'member') => boolean;
  canUserAddOption: (pollId: string) => boolean;
  isPollExpired: (pollId: string) => boolean;
  getExpiryCountdown: (pollId: string) => string | null;
  calculatePercentage: (pollId: string, optionId: string) => number;
  
  // State management
  setPollMetadata: (pollId: string, metadata: PollMessageMetadata) => void;
  updatePollMetadata: (pollId: string, updates: Partial<PollMessageMetadata>) => void;
  clearError: () => void;
  reset: () => void;
  
  // Idempotency
  isEventProcessed: (eventId: string) => boolean;
  markEventProcessed: (eventId: string) => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const usePollStore = create<PollState>((set, get) => ({
  pollsByConversation: new Map(),
  pollDetails: new Map(),
  pollMetadata: new Map(),
  isLoading: false,
  isCreating: false,
  isVoting: false,
  error: null,
  userVotes: new Map(),
  processedEventIds: new Map(),

  // ==================== Idempotency Helpers ====================
  
  isEventProcessed: (eventId: string) => {
    const timestamp = get().processedEventIds.get(eventId);
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_TTL;
  },
  
  markEventProcessed: (eventId: string) => {
    set((state) => {
      const newMap = new Map(state.processedEventIds);
      newMap.set(eventId, Date.now());
      
      // Cleanup old events
      const now = Date.now();
      for (const [id, timestamp] of newMap.entries()) {
        if (now - timestamp > CACHE_TTL) {
          newMap.delete(id);
        }
      }
      
      return { processedEventIds: newMap };
    });
  },

  // ==================== API Actions ====================
  
  createPoll: async (conversationId: string, payload: CreatePollRequestDTO) => {
    const validationError = validateCreatePoll(payload);
    if (validationError) {
      throw new Error(validationError);
    }
    
    set({ isCreating: true, error: null });
    try {
      const response = await createPoll(conversationId, payload);
      console.log('[PollStore] Create poll response:', JSON.stringify(response, null, 2));
      const { poll_id, message_id } = response.data;
      console.log('[PollStore] Extracted:', { poll_id, message_id });
      
      // Add to conversation polls list
      set((state) => {
        const newPollsByConv = new Map(state.pollsByConversation);
        const existingPolls = newPollsByConv.get(conversationId) || [];
        
        const newPollItem: PollListItem = {
          poll_id,
          conversation_id: conversationId,
          creator_id: '', // Will be filled when fetched
          question: payload.question,
          status: 'active',
          allow_multiple: payload.allow_multiple || false,
          allow_add_option: payload.allow_add_option || false,
          expires_at: payload.expires_in_hours 
            ? Date.now() + payload.expires_in_hours * 60 * 60 * 1000 
            : null,
          closed_at: null,
          created_at: Date.now(),
          options_count: payload.options.length,
        };
        
        newPollsByConv.set(conversationId, [newPollItem, ...existingPolls]);
        
        return { pollsByConversation: newPollsByConv, isCreating: false };
      });
      
      return { pollId: poll_id, messageId: message_id };
    } catch (err: any) {
      set({ error: err.message || 'Failed to create poll', isCreating: false });
      throw err;
    }
  },
  
  fetchPolls: async (conversationId: string, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await listPolls(conversationId, params);
      const items = response.data?.items || [];
      
      set((state) => {
        const newPollsByConv = new Map(state.pollsByConversation);
        newPollsByConv.set(conversationId, items);
        return { pollsByConversation: newPollsByConv, isLoading: false };
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch polls', isLoading: false });
      throw err;
    }
  },
  
  fetchPollDetail: async (conversationId: string, pollId: string, force = false) => {
    // Check cache
    const cached = get().pollDetails.get(pollId);
    if (cached && !force) {
      return cached;
    }
    
    try {
      const response = await getPollDetail(conversationId, pollId);
      const detail = response.data;
      
      set((state) => {
        const newPollDetails = new Map(state.pollDetails);
        newPollDetails.set(pollId, detail);
        
        // Also update user votes
        const newUserVotes = new Map(state.userVotes);
        newUserVotes.set(pollId, detail.my_vote || []);
        
        return { pollDetails: newPollDetails, userVotes: newUserVotes };
      });
      
      return detail;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch poll detail' });
      return null;
    }
  },
  
  editPoll: async (conversationId: string, pollId: string, payload: EditPollRequestDTO) => {
    const validationError = validateEditPoll(payload);
    if (validationError) {
      throw new Error(validationError);
    }

    set({ isLoading: true, error: null });
    try {
      await editPoll(conversationId, pollId, payload);

      // Optimistically update poll detail cache with edited data
      set((state) => {
        const existing = state.pollDetails.get(pollId);
        if (existing) {
          const updated = { ...existing };
          if (payload.question !== undefined) updated.question = payload.question;
          if (payload.allow_multiple !== undefined) updated.allow_multiple = payload.allow_multiple;
          if (payload.allow_add_option !== undefined) updated.allow_add_option = payload.allow_add_option;
          if (payload.expires_at !== undefined) updated.expires_at = payload.expires_at;
          if (payload.edited_option_labels) {
            updated.options = updated.options.map(opt => {
              const edited = payload.edited_option_labels?.find(
                e => e.option_id === opt.option_id
              );
              return edited ? { ...opt, label: edited.label } : opt;
            });
          }
          const newDetails = new Map(state.pollDetails);
          newDetails.set(pollId, updated);
          return { pollDetails: newDetails };
        }
        return state;
      });

      set({ isLoading: false });

      // Background refresh - don't await to avoid blocking UI
      get().fetchPollDetail(conversationId, pollId, true).catch(console.error);
    } catch (err: any) {
      set({ error: err.message || 'Failed to edit poll', isLoading: false });
      throw err;
    }
  },
  
  castVote: async (conversationId: string, pollId: string, optionIds: string[]) => {
    set({ isVoting: true, error: null });
    try {
      const response = await castVote(conversationId, pollId, { option_ids: optionIds });

      // Optimistically update user votes and vote counts
      set((state) => {
        const newUserVotes = new Map(state.userVotes);
        newUserVotes.set(pollId, optionIds);

        // Optimistically update poll detail vote counts
        const newDetails = new Map(state.pollDetails);
        const existing = newDetails.get(pollId);
        if (existing) {
          const updated = {
            ...existing,
            total_voters: (existing.total_voters || 0) + (existing.my_vote?.length === 0 ? 1 : 0),
            my_vote: optionIds,
          };
          updated.options = updated.options.map(opt => ({
            ...opt,
            vote_count: opt.vote_count + (optionIds.includes(opt.option_id) ? 1 : 0) - (existing.my_vote?.includes(opt.option_id) ? 1 : 0),
          }));
          newDetails.set(pollId, updated);
        }

        return { userVotes: newUserVotes, pollDetails: newDetails, isVoting: false };
      });

      // Background refresh - WebSocket will also update the data
      get().fetchPollDetail(conversationId, pollId, true).catch(console.error);

    } catch (err: any) {
      set({ error: err.message || 'Failed to cast vote', isVoting: false });
      throw err;
    }
  },
  
  retractVote: async (conversationId: string, pollId: string) => {
    set({ isVoting: true, error: null });
    try {
      await retractVote(conversationId, pollId);

      // Clear user votes and update vote counts optimistically
      set((state) => {
        const newUserVotes = new Map(state.userVotes);
        const previousVotes = newUserVotes.get(pollId) || [];
        newUserVotes.set(pollId, []);

        // Optimistically update poll detail
        const newDetails = new Map(state.pollDetails);
        const existing = newDetails.get(pollId);
        if (existing && previousVotes.length > 0) {
          const updated = {
            ...existing,
            total_voters: Math.max(0, (existing.total_voters || 0) - 1),
            my_vote: [],
          };
          updated.options = updated.options.map(opt => ({
            ...opt,
            vote_count: Math.max(0, opt.vote_count - (previousVotes.includes(opt.option_id) ? 1 : 0)),
          }));
          newDetails.set(pollId, updated);
        }

        return { userVotes: newUserVotes, pollDetails: newDetails, isVoting: false };
      });

      // Background refresh - WebSocket will also update the data
      get().fetchPollDetail(conversationId, pollId, true).catch(console.error);

    } catch (err: any) {
      set({ error: err.message || 'Failed to retract vote', isVoting: false });
      throw err;
    }
  },
  
  addOption: async (conversationId: string, pollId: string, label: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await addPollOption(conversationId, pollId, { label });

      // Optimistically add the new option to cache
      set((state) => {
        const newDetails = new Map(state.pollDetails);
        const existing = newDetails.get(pollId);
        if (existing && response.data.option_id) {
          const updated = {
            ...existing,
            options: [...existing.options, {
              option_id: response.data.option_id,
              label: label,
              vote_count: 0,
              order_index: existing.options.length,
            }],
          };
          newDetails.set(pollId, updated);
        }
        return { pollDetails: newDetails };
      });

      set({ isLoading: false });

      // Background refresh
      get().fetchPollDetail(conversationId, pollId, true).catch(console.error);
    } catch (err: any) {
      set({ error: err.message || 'Failed to add option', isLoading: false });
      throw err;
    }
  },
  
  removeOption: async (conversationId: string, pollId: string, optionId: string) => {
    set({ isLoading: true, error: null });
    try {
      await removePollOption(conversationId, pollId, optionId);

      // Optimistically remove the option from cache
      set((state) => {
        const newDetails = new Map(state.pollDetails);
        const existing = newDetails.get(pollId);
        if (existing) {
          const removedOption = existing.options.find(o => o.option_id === optionId);
          const updated = {
            ...existing,
            options: existing.options.filter(o => o.option_id !== optionId),
            total_votes: existing.total_votes - (removedOption?.vote_count || 0),
          };
          newDetails.set(pollId, updated);
        }
        return { pollDetails: newDetails };
      });

      set({ isLoading: false });

      // Background refresh
      get().fetchPollDetail(conversationId, pollId, true).catch(console.error);
    } catch (err: any) {
      set({ error: err.message || 'Failed to remove option', isLoading: false });
      throw err;
    }
  },
  
  closePoll: async (conversationId: string, pollId: string) => {
    set({ isLoading: true, error: null });
    try {
      await closePoll(conversationId, pollId);

      // Optimistically update poll status
      set((state) => {
        const newDetails = new Map(state.pollDetails);
        const existing = newDetails.get(pollId);
        if (existing) {
          const updated = {
            ...existing,
            status: 'closed' as const,
            closed_at: Date.now(),
          };
          newDetails.set(pollId, updated);
        }
        return { pollDetails: newDetails };
      });

      set({ isLoading: false });

      // Background refresh
      get().fetchPollDetail(conversationId, pollId, true).catch(console.error);
    } catch (err: any) {
      set({ error: err.message || 'Failed to close poll', isLoading: false });
      throw err;
    }
  },

  // ==================== Socket Event Handlers ====================
  
  handlePollCreated: (payload: GroupPollCreatedPayload, eventId?: string) => {
    if (eventId && get().isEventProcessed(eventId)) return;
    
    // Build PollMessageMetadata from payload
    const metadata: PollMessageMetadata = {
      poll_id: payload.poll_id,
      question: payload.question,
      options: payload.options.map(o => ({
        option_id: o.option_id,
        label: o.label,
        order_index: o.order_index,
        vote_count: 0,
      })),
      total_votes: 0,
      total_voters: 0,
      allow_multiple: payload.allow_multiple,
      allow_add_option: payload.allow_add_option,
      status: 'active',
      expires_at: payload.expires_at,
      closed_at: null,
      closed_reason: null,
    };
    
    set((state) => {
      const newMetadata = new Map(state.pollMetadata);
      newMetadata.set(payload.poll_id, metadata);
      return { pollMetadata: newMetadata };
    });
    
    if (eventId) get().markEventProcessed(eventId);
    
    console.log('[PollStore] Poll created:', payload.poll_id);
  },
  
  handlePollEdited: (payload: GroupPollEditedPayload, eventId?: string) => {
    if (eventId && get().isEventProcessed(eventId)) return;
    
    set((state) => {
      const newMetadata = new Map(state.pollMetadata);
      const existing = newMetadata.get(payload.poll_id);
      
      if (existing) {
        const updated = { ...existing };
        
        if (payload.changes.question !== undefined) {
          updated.question = payload.changes.question;
        }
        if (payload.changes.allow_multiple !== undefined) {
          updated.allow_multiple = payload.changes.allow_multiple;
        }
        if (payload.changes.allow_add_option !== undefined) {
          updated.allow_add_option = payload.changes.allow_add_option;
        }
        if (payload.changes.expires_at !== undefined) {
          updated.expires_at = payload.changes.expires_at;
        }
        if (payload.changes.edited_option_labels) {
          updated.options = updated.options.map(opt => {
            const edited = payload.changes.edited_option_labels?.find(
              e => e.option_id === opt.option_id
            );
            return edited ? { ...opt, label: edited.label } : opt;
          });
        }
        
        newMetadata.set(payload.poll_id, updated);
      }
      
      return { pollMetadata: newMetadata };
    });
    
    // Also update poll detail if cached
    set((state) => {
      const newDetails = new Map(state.pollDetails);
      const existing = newDetails.get(payload.poll_id);
      
      if (existing) {
        const updated = { ...existing };
        
        if (payload.changes.question !== undefined) updated.question = payload.changes.question;
        if (payload.changes.allow_multiple !== undefined) updated.allow_multiple = payload.changes.allow_multiple;
        if (payload.changes.allow_add_option !== undefined) updated.allow_add_option = payload.changes.allow_add_option;
        if (payload.changes.expires_at !== undefined) updated.expires_at = payload.changes.expires_at;
        if (payload.changes.edited_option_labels) {
          updated.options = updated.options.map(opt => {
            const edited = payload.changes.edited_option_labels?.find(
              e => e.option_id === opt.option_id
            );
            return edited ? { ...opt, label: edited.label } : opt;
          });
        }
        
        newDetails.set(payload.poll_id, updated);
      }
      
      return { pollDetails: newDetails };
    });
    
    if (eventId) get().markEventProcessed(eventId);
    
    console.log('[PollStore] Poll edited:', payload.poll_id);
  },
  
  handlePollVoteUpdated: (payload: GroupPollVoteUpdatedPayload, eventId?: string) => {
    if (eventId && get().isEventProcessed(eventId)) return;
    
    // Note: In v1, tally may be empty - we should refetch detail
    // But we'll update what we have
    
    set((state) => {
      const newMetadata = new Map(state.pollMetadata);
      const existing = newMetadata.get(payload.poll_id);
      
      if (existing) {
        const updated = { 
          ...existing,
          total_votes: payload.total_votes,
        };
        
        if (payload.tally && payload.tally.length > 0) {
          updated.options = updated.options.map(opt => {
            const tallyItem = payload.tally.find(t => t.option_id === opt.option_id);
            return tallyItem 
              ? { ...opt, vote_count: tallyItem.vote_count }
              : opt;
          });
        }
        
        newMetadata.set(payload.poll_id, updated);
      }
      
      return { pollMetadata: newMetadata };
    });
    
    // Also update poll detail
    set((state) => {
      const newDetails = new Map(state.pollDetails);
      const existing = newDetails.get(payload.poll_id);
      
      if (existing) {
        const updated = {
          ...existing,
          total_votes: payload.total_votes,
          total_voters: payload.total_voters,
        };
        
        if (payload.tally && payload.tally.length > 0) {
          updated.options = updated.options.map(opt => {
            const tallyItem = payload.tally.find(t => t.option_id === opt.option_id);
            return tallyItem
              ? { ...opt, vote_count: tallyItem.vote_count }
              : opt;
          });
        }
        
        newDetails.set(payload.poll_id, updated);
      }
      
      return { pollDetails: newDetails };
    });
    
    if (eventId) get().markEventProcessed(eventId);
    
    console.log('[PollStore] Poll vote updated:', payload.poll_id);
  },
  
  handlePollOptionAdded: (payload: GroupPollOptionAddedPayload, eventId?: string) => {
    if (eventId && get().isEventProcessed(eventId)) return;
    
    const newOption = {
      option_id: payload.option_id,
      label: payload.label,
      order_index: payload.order_index,
      vote_count: 0,
      added_by_user_id: payload.added_by_user_id,
    };
    
    set((state) => {
      const newMetadata = new Map(state.pollMetadata);
      const existing = newMetadata.get(payload.poll_id);
      
      if (existing && !existing.options.find(o => o.option_id === payload.option_id)) {
        newMetadata.set(payload.poll_id, {
          ...existing,
          options: [...existing.options, newOption],
        });
      }
      
      return { pollMetadata: newMetadata };
    });
    
    // Also update poll detail
    set((state) => {
      const newDetails = new Map(state.pollDetails);
      const existing = newDetails.get(payload.poll_id);
      
      if (existing && !existing.options.find(o => o.option_id === payload.option_id)) {
        newDetails.set(payload.poll_id, {
          ...existing,
          options: [...existing.options, newOption],
        });
      }
      
      return { pollDetails: newDetails };
    });
    
    if (eventId) get().markEventProcessed(eventId);
    
    console.log('[PollStore] Poll option added:', payload.poll_id, payload.option_id);
  },
  
  handlePollOptionRemoved: (payload: GroupPollOptionRemovedPayload, eventId?: string) => {
    if (eventId && get().isEventProcessed(eventId)) return;
    
    set((state) => {
      const newMetadata = new Map(state.pollMetadata);
      const existing = newMetadata.get(payload.poll_id);
      
      if (existing) {
        newMetadata.set(payload.poll_id, {
          ...existing,
          options: existing.options.filter(o => o.option_id !== payload.option_id),
        });
      }
      
      return { pollMetadata: newMetadata };
    });
    
    // Also update poll detail
    set((state) => {
      const newDetails = new Map(state.pollDetails);
      const existing = newDetails.get(payload.poll_id);
      
      if (existing) {
        newDetails.set(payload.poll_id, {
          ...existing,
          options: existing.options.filter(o => o.option_id !== payload.option_id),
        });
      }
      
      return { pollDetails: newDetails };
    });
    
    if (eventId) get().markEventProcessed(eventId);
    
    console.log('[PollStore] Poll option removed:', payload.poll_id, payload.option_id);
  },
  
  handlePollClosed: (payload: GroupPollClosedPayload, eventId?: string) => {
    if (eventId && get().isEventProcessed(eventId)) return;
    
    set((state) => {
      const newMetadata = new Map(state.pollMetadata);
      const existing = newMetadata.get(payload.poll_id);
      
      if (existing) {
        newMetadata.set(payload.poll_id, {
          ...existing,
          status: 'closed' as PollStatus,
          closed_at: payload.closed_at,
          closed_reason: payload.reason,
          options: existing.options.map(opt => {
            const finalTally = payload.final_tally.find(t => t.option_id === opt.option_id);
            return finalTally
              ? { ...opt, vote_count: finalTally.vote_count }
              : opt;
          }),
        });
      }
      
      return { pollMetadata: newMetadata };
    });
    
    // Also update poll detail
    set((state) => {
      const newDetails = new Map(state.pollDetails);
      const existing = newDetails.get(payload.poll_id);
      
      if (existing) {
        newDetails.set(payload.poll_id, {
          ...existing,
          status: 'closed',
          closed_at: payload.closed_at,
          closed_reason: payload.reason,
          options: existing.options.map(opt => {
            const finalTally = payload.final_tally.find(t => t.option_id === opt.option_id);
            return finalTally
              ? { ...opt, vote_count: finalTally.vote_count }
              : opt;
          }),
        });
      }
      
      return { pollDetails: newDetails };
    });
    
    if (eventId) get().markEventProcessed(eventId);
    
    console.log('[PollStore] Poll closed:', payload.poll_id, payload.reason);
  },

  // ==================== Utility Methods ====================
  
  getPollById: (pollId: string) => {
    const state = get();
    return state.pollDetails.get(pollId) || state.pollMetadata.get(pollId);
  },
  
  getPollsForConversation: (conversationId: string) => {
    return get().pollsByConversation.get(conversationId) || [];
  },
  
  hasUserVoted: (pollId: string, optionId?: string) => {
    const userVotes = get().userVotes.get(pollId) || [];
    if (optionId) {
      return userVotes.includes(optionId);
    }
    return userVotes.length > 0;
  },
  
  getSelectedOptions: (pollId: string) => {
    return get().userVotes.get(pollId) || [];
  },
  
  canUserEdit: (pollId: string, userId: string) => {
    const poll = get().pollDetails.get(pollId);
    if (!poll) return false;
    return canEditPoll(poll, userId);
  },
  
  canUserClose: (pollId: string, userId: string, userRole?: 'owner' | 'admin' | 'member') => {
    const poll = get().pollDetails.get(pollId);
    if (!poll) return false;
    return canClosePoll(poll, userId, userRole);
  },
  
  canUserAddOption: (pollId: string) => {
    const poll = get().pollDetails.get(pollId) || get().pollMetadata.get(pollId);
    if (!poll) return false;
    return canAddOption(poll);
  },
  
  isPollExpired: (pollId: string) => {
    const poll = get().pollDetails.get(pollId) || get().pollMetadata.get(pollId);
    if (!poll) return false;
    return isPollExpired(poll);
  },
  
  getExpiryCountdown: (pollId: string) => {
    const poll = get().pollDetails.get(pollId) || get().pollMetadata.get(pollId);
    if (!poll) return null;
    return formatExpiryCountdown(poll.expires_at);
  },
  
  calculatePercentage: (pollId: string, optionId: string) => {
    const poll = get().pollDetails.get(pollId) || get().pollMetadata.get(pollId);
    if (!poll) return 0;
    
    const option = poll.options.find(o => o.option_id === optionId);
    if (!option) return 0;
    
    if (poll.total_votes === 0) return 0;
    return Math.round((option.vote_count / poll.total_votes) * 100);
  },
  
  setPollMetadata: (pollId: string, metadata: PollMessageMetadata) => {
    set((state) => {
      const newMetadata = new Map(state.pollMetadata);
      newMetadata.set(pollId, metadata);
      return { pollMetadata: newMetadata };
    });
  },
  
  updatePollMetadata: (pollId: string, updates: Partial<PollMessageMetadata>) => {
    set((state) => {
      const newMetadata = new Map(state.pollMetadata);
      const existing = newMetadata.get(pollId);
      
      if (existing) {
        newMetadata.set(pollId, { ...existing, ...updates });
      }
      
      return { pollMetadata: newMetadata };
    });
  },
  
  clearError: () => set({ error: null }),
  
  reset: () => {
    set({
      pollsByConversation: new Map(),
      pollDetails: new Map(),
      pollMetadata: new Map(),
      isLoading: false,
      isCreating: false,
      isVoting: false,
      error: null,
      userVotes: new Map(),
      processedEventIds: new Map(),
    });
  },
}));

export default usePollStore;
