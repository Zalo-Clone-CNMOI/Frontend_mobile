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
import { PollMessageMetadata } from '../types/dto/PollDTO';
import { getDeduplicationService } from './deduplicationService';

const dedupService = getDeduplicationService();

let cachedUserId: string | null = null;

export const setPollCurrentUserId = (userId: string) => {
  cachedUserId = userId;
};

const getCurrentUserId = (): string | null => {
  return cachedUserId;
};

const isEventProcessed = (eventId: string): boolean => {
  return dedupService.isEventProcessed(eventId);
};

const markEventProcessed = (eventId: string) => {
  dedupService.markEventProcessed(eventId);
};

interface PollEventCallbacks {
  onPollCreated?: (payload: GroupPollCreatedPayload) => void;
  onPollEdited?: (payload: GroupPollEditedPayload) => void;
  onPollVoteUpdated?: (payload: GroupPollVoteUpdatedPayload) => void;
  onPollOptionAdded?: (payload: GroupPollOptionAddedPayload) => void;
  onPollOptionRemoved?: (payload: GroupPollOptionRemovedPayload) => void;
  onPollClosed?: (payload: GroupPollClosedPayload) => void;
}

let eventCallbacks: PollEventCallbacks = {};

export const setPollEventCallbacks = (callbacks: PollEventCallbacks) => {
  eventCallbacks = { ...eventCallbacks, ...callbacks };
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
export default {
  subscribeToPollEvents,
  setPollEventCallbacks,
  setPollCurrentUserId,
};
