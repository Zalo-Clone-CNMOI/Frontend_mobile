import { getSocket } from './socket';
import {
  WsEvents,
  GroupPollCreatedPayload,
  GroupPollEditedPayload,
  GroupPollVoteUpdatedPayload,
  GroupPollOptionAddedPayload,
  GroupPollOptionRemovedPayload,
  GroupPollClosedPayload,
} from '../realtime/events';
import { PollDetail, PollStatus, PollMessageMetadata, PollErrorCode } from '../types/dto/PollDTO';

// Track processed events for idempotency
const processedEvents = new Map<string, number>();
const EVENT_ID_TTL = 5 * 60 * 1000; // 5 minutes

// Cached user ID for use outside React context
let cachedUserId: string | null = null;

// Set current user ID (call this from React context)
export const setPollCurrentUserId = (userId: string) => {
  cachedUserId = userId;
};

// Get current user ID from cache
const getCurrentUserId = (): string | null => {
  return cachedUserId;
};

// Cleanup expired event IDs
const cleanupExpiredEventIds = () => {
  const now = Date.now();
  for (const [eventId, timestamp] of processedEvents.entries()) {
    if (now - timestamp > EVENT_ID_TTL) {
      processedEvents.delete(eventId);
    }
  }
};

// Check if event was already processed
const isEventProcessed = (eventId: string): boolean => {
  cleanupExpiredEventIds();
  return processedEvents.has(eventId);
};

// Mark event as processed
const markEventProcessed = (eventId: string) => {
  processedEvents.set(eventId, Date.now());
};

// Event callbacks registry
interface PollEventCallbacks {
  onPollCreated?: (payload: GroupPollCreatedPayload) => void;
  onPollEdited?: (payload: GroupPollEditedPayload) => void;
  onPollVoteUpdated?: (payload: GroupPollVoteUpdatedPayload) => void;
  onPollOptionAdded?: (payload: GroupPollOptionAddedPayload) => void;
  onPollOptionRemoved?: (payload: GroupPollOptionRemovedPayload) => void;
  onPollClosed?: (payload: GroupPollClosedPayload) => void;
}

let eventCallbacks: PollEventCallbacks = {};

// Set event callbacks (call this from your component/hook)
export const setPollEventCallbacks = (callbacks: PollEventCallbacks) => {
  eventCallbacks = { ...eventCallbacks, ...callbacks };
};

// Clear all callbacks
export const clearPollEventCallbacks = () => {
  eventCallbacks = {};
};

/**
 * Subscribe to poll WebSocket events
 * Call this when entering a conversation or chat screen
 */
export const subscribeToPollEvents = () => {
  const socket = getSocket();
  if (!socket) {
    console.warn('[PollEvents] Socket not available');
    return;
  }

  const currentUserId = getCurrentUserId();

  // ==================== Handle POLL_EXPIRED Error ====================
  // Listen for error events and treat POLL_EXPIRED as poll closed
  socket.on('error', (error: any) => {
    if (error?.code === 'POLL_EXPIRED' && error?.poll_id) {
      console.log('[PollEvents] POLL_EXPIRED error, treating as poll closed:', error.poll_id);
      
      // Simulate a poll closed event
      const closedPayload: GroupPollClosedPayload = {
        poll_id: error.poll_id,
        conversation_id: error.conversation_id || '',
        closed_by_user_id: null,
        reason: 'expired',
        final_tally: error.final_tally || [],
        closed_at: Date.now(),
      };
      
      eventCallbacks.onPollClosed?.(closedPayload);
    }
  });

  // ==================== Poll Created ====================
  socket.on(WsEvents.GroupPollCreated, (payload: GroupPollCreatedPayload, eventId?: string) => {
    const id = eventId || `poll-created:${payload.poll_id}:${payload.created_at}`;
    if (isEventProcessed(id)) return;
    markEventProcessed(id);

    console.log('[PollEvents] Poll created:', payload.poll_id, payload.question);

    // Convert to PollMessageMetadata format for storage
    const pollMetadata: PollMessageMetadata = {
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

    // Invoke callback
    eventCallbacks.onPollCreated?.(payload);
  });

  // ==================== Poll Edited ====================
  socket.on(WsEvents.GroupPollEdited, (payload: GroupPollEditedPayload, eventId?: string) => {
    const id = eventId || `poll-edited:${payload.poll_id}:${payload.edited_at}`;
    if (isEventProcessed(id)) return;
    markEventProcessed(id);

    console.log('[PollEvents] Poll edited:', payload.poll_id, payload.changes);

    eventCallbacks.onPollEdited?.(payload);
  });

  // ==================== Poll Vote Updated ====================
  socket.on(WsEvents.GroupPollVoteUpdated, (payload: GroupPollVoteUpdatedPayload, eventId?: string) => {
    const id = eventId || `poll-vote:${payload.poll_id}:${payload.updated_at}`;
    if (isEventProcessed(id)) return;
    markEventProcessed(id);

    console.log('[PollEvents] Poll vote updated:', payload.poll_id, {
      total_votes: payload.total_votes,
      total_voters: payload.total_voters,
    });

    // Note: In v1, tally may be empty - need to refetch poll detail
    // The callback should handle this by calling getPollDetail()

    eventCallbacks.onPollVoteUpdated?.(payload);
  });

  // ==================== Poll Option Added ====================
  socket.on(WsEvents.GroupPollOptionAdded, (payload: GroupPollOptionAddedPayload, eventId?: string) => {
    const id = eventId || `poll-option-added:${payload.poll_id}:${payload.option_id}`;
    if (isEventProcessed(id)) return;
    markEventProcessed(id);

    console.log('[PollEvents] Poll option added:', payload.poll_id, payload.label);

    eventCallbacks.onPollOptionAdded?.(payload);
  });

  // ==================== Poll Option Removed ====================
  socket.on(WsEvents.GroupPollOptionRemoved, (payload: GroupPollOptionRemovedPayload, eventId?: string) => {
    const id = eventId || `poll-option-removed:${payload.poll_id}:${payload.option_id}`;
    if (isEventProcessed(id)) return;
    markEventProcessed(id);

    console.log('[PollEvents] Poll option removed:', payload.poll_id, payload.option_id);

    eventCallbacks.onPollOptionRemoved?.(payload);
  });

  // ==================== Poll Closed ====================
  socket.on(WsEvents.GroupPollClosed, (payload: GroupPollClosedPayload, eventId?: string) => {
    const id = eventId || `poll-closed:${payload.poll_id}:${payload.closed_at}`;
    if (isEventProcessed(id)) return;
    markEventProcessed(id);

    console.log('[PollEvents] Poll closed:', payload.poll_id, payload.reason, {
      final_tally: payload.final_tally,
    });

    eventCallbacks.onPollClosed?.(payload);
  });

  console.log('[PollEvents] Subscribed to poll events');
};

/**
 * Unsubscribe from poll WebSocket events
 * Call this when leaving a conversation or chat screen
 */
export const unsubscribeFromPollEvents = () => {
  const socket = getSocket();
  if (!socket) return;

  socket.off('error');
  socket.off(WsEvents.GroupPollCreated);
  socket.off(WsEvents.GroupPollEdited);
  socket.off(WsEvents.GroupPollVoteUpdated);
  socket.off(WsEvents.GroupPollOptionAdded);
  socket.off(WsEvents.GroupPollOptionRemoved);
  socket.off(WsEvents.GroupPollClosed);

  console.log('[PollEvents] Unsubscribed from poll events');
};

/**
 * Update poll state from WebSocket payload
 * Helper function to merge poll updates
 */
export const mergePollUpdate = (
  currentPoll: PollDetail | PollMessageMetadata,
  update: Partial<PollDetail> | Partial<PollMessageMetadata>,
): PollDetail | PollMessageMetadata => {
  return {
    ...currentPoll,
    ...update,
    // Preserve nested options if not provided in update
    options: update.options || currentPoll.options,
  };
};

/**
 * Apply poll edit changes to current poll state
 */
export const applyPollEditChanges = (
  currentPoll: PollDetail | PollMessageMetadata,
  changes: GroupPollEditedPayload['changes'],
): PollDetail | PollMessageMetadata => {
  const updatedPoll = { ...currentPoll };

  if (changes.question !== undefined) {
    updatedPoll.question = changes.question;
  }

  if (changes.allow_multiple !== undefined) {
    updatedPoll.allow_multiple = changes.allow_multiple;
  }

  if (changes.allow_add_option !== undefined) {
    updatedPoll.allow_add_option = changes.allow_add_option;
  }

  if (changes.expires_at !== undefined) {
    updatedPoll.expires_at = changes.expires_at;
  }

  // Apply edited option labels
  if (changes.edited_option_labels && changes.edited_option_labels.length > 0) {
    updatedPoll.options = updatedPoll.options.map(option => {
      const editedLabel = changes.edited_option_labels?.find(
        e => e.option_id === option.option_id
      );
      if (editedLabel) {
        return { ...option, label: editedLabel.label };
      }
      return option;
    });
  }

  return updatedPoll;
};

/**
 * Apply vote update to poll state
 * Note: In v1, the tally may be empty - this just updates what we have
 */
export const applyVoteUpdate = (
  currentPoll: PollDetail | PollMessageMetadata,
  payload: GroupPollVoteUpdatedPayload,
): PollDetail | PollMessageMetadata => {
  const updatedPoll = { ...currentPoll };

  // Update totals
  updatedPoll.total_votes = payload.total_votes;

  // If we have tally data, update vote counts
  if (payload.tally && payload.tally.length > 0) {
    updatedPoll.options = updatedPoll.options.map(option => {
      const tallyItem = payload.tally.find(t => t.option_id === option.option_id);
      if (tallyItem) {
        return { ...option, vote_count: tallyItem.vote_count };
      }
      return option;
    });
  }

  return updatedPoll;
};

/**
 * Add option to poll state
 */
export const applyOptionAdded = (
  currentPoll: PollDetail | PollMessageMetadata,
  payload: GroupPollOptionAddedPayload,
): PollDetail | PollMessageMetadata => {
  const newOption = {
    option_id: payload.option_id,
    label: payload.label,
    order_index: payload.order_index,
    vote_count: 0,
    added_by_user_id: payload.added_by_user_id,
  };

  return {
    ...currentPoll,
    options: [...currentPoll.options, newOption],
  };
};

/**
 * Remove option from poll state
 */
export const applyOptionRemoved = (
  currentPoll: PollDetail | PollMessageMetadata,
  payload: GroupPollOptionRemovedPayload,
): PollDetail | PollMessageMetadata => {
  return {
    ...currentPoll,
    options: currentPoll.options.filter(o => o.option_id !== payload.option_id),
  };
};

/**
 * Close poll in state
 */
export const applyPollClosed = (
  currentPoll: PollDetail | PollMessageMetadata,
  payload: GroupPollClosedPayload,
): PollDetail | PollMessageMetadata => {
  return {
    ...currentPoll,
    status: 'closed' as PollStatus,
    closed_at: payload.closed_at,
    closed_reason: payload.reason,
    options: currentPoll.options.map(option => {
      const finalTallyItem = payload.final_tally.find(t => t.option_id === option.option_id);
      if (finalTallyItem) {
        return { ...option, vote_count: finalTallyItem.vote_count };
      }
      return option;
    }),
  };
};

/**
 * Check if current user has voted on a poll
 */
export const hasUserVoted = (poll: PollDetail, userId: string): boolean => {
  return poll.my_vote?.length > 0 || false;
};

/**
 * Get selected option IDs for current user
 */
export const getUserVotes = (poll: PollDetail, userId: string): string[] => {
  return poll.my_vote || [];
};

/**
 * Calculate vote percentage for an option
 */
export const calculateVotePercentage = (voteCount: number, totalVotes: number): number => {
  if (totalVotes === 0) return 0;
  return Math.round((voteCount / totalVotes) * 100);
};

export default {
  subscribeToPollEvents,
  unsubscribeFromPollEvents,
  setPollEventCallbacks,
  clearPollEventCallbacks,
  setPollCurrentUserId,
  mergePollUpdate,
  applyPollEditChanges,
  applyVoteUpdate,
  applyOptionAdded,
  applyOptionRemoved,
  applyPollClosed,
  hasUserVoted,
  getUserVotes,
  calculateVotePercentage,
};
