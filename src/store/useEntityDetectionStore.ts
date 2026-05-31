import { create } from 'zustand';

export interface DetectedEntity {
  text: string;
  type: 'tool' | 'company' | 'person' | 'concept' | 'location' | 'product' | 'other';
  start_index: number;
  end_index: number;
  confidence: number;
}

/**
 * Entities arrive a moment after a message renders (async LLM round-trip over
 * Kafka + WS). We mark a message "pending" when it lands so the bubble can show
 * an "analyzing…" hint instead of looking broken/empty. Pending self-clears two
 * ways: (1) when the entity result arrives, or (2) after this deadline. The
 * timeout is REQUIRED because the backend only broadcasts `message:entities`
 * for NON-EMPTY results — a message with no detected entities would otherwise
 * stay pending forever. 8s server-side detection timeout + 2s slack.
 *
 * ⚠️ COUPLING: this MUST stay ≥ the backend AI_ENTITY_DETECTION_TIMEOUT_MS
 * (default 8000, see Backend libs/config app-config.ts). If ops raises the
 * server timeout above ~8s, bump this too — otherwise the hint vanishes while
 * the server is still working and the bubble shows neither hint nor entities.
 */
const PENDING_TIMEOUT_MS = 10_000;

// Pending timers live OUTSIDE the reactive state: they are non-serializable and
// must never trigger a render. Keyed by messageId; always cleared on resolve.
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearPendingTimer(messageId: string): void {
  const timer = pendingTimers.get(messageId);
  if (timer) {
    clearTimeout(timer);
    pendingTimers.delete(messageId);
  }
}

interface EntityDetectionState {
  entitiesByMessage: Map<string, DetectedEntity[]>;
  /** Messages whose entity detection is still in-flight (drives the "analyzing…" hint). */
  pendingByMessage: Set<string>;

  getEntities(messageId: string): DetectedEntity[];
  setEntities(messageId: string, entities: DetectedEntity[]): void;
  clearEntities(messageId: string): void;
  /** Mark a (live, text) message as awaiting entity detection. */
  markPending(messageId: string): void;
  isPending(messageId: string): boolean;
  clearAll(): void;
}

export const useEntityDetectionStore = create<EntityDetectionState>((set, get) => ({
  entitiesByMessage: new Map(),
  pendingByMessage: new Set(),

  getEntities: (messageId) => {
    return get().entitiesByMessage.get(messageId) || [];
  },

  setEntities: (messageId, entities) => {
    clearPendingTimer(messageId);
    set((state) => {
      const newEntities = new Map(state.entitiesByMessage);
      newEntities.set(messageId, entities);
      // Any result (even an empty array) resolves the pending state.
      let pendingByMessage = state.pendingByMessage;
      if (pendingByMessage.has(messageId)) {
        pendingByMessage = new Set(pendingByMessage);
        pendingByMessage.delete(messageId);
      }
      return { entitiesByMessage: newEntities, pendingByMessage };
    });
  },

  clearEntities: (messageId) => {
    clearPendingTimer(messageId);
    set((state) => {
      const newEntities = new Map(state.entitiesByMessage);
      newEntities.delete(messageId);
      let pendingByMessage = state.pendingByMessage;
      if (pendingByMessage.has(messageId)) {
        pendingByMessage = new Set(pendingByMessage);
        pendingByMessage.delete(messageId);
      }
      return { entitiesByMessage: newEntities, pendingByMessage };
    });
  },

  markPending: (messageId) => {
    if (!messageId) return;
    // Result already arrived (race): nothing to wait for.
    if (get().entitiesByMessage.has(messageId)) return;

    clearPendingTimer(messageId);
    pendingTimers.set(
      messageId,
      setTimeout(() => {
        pendingTimers.delete(messageId);
        set((state) => {
          if (!state.pendingByMessage.has(messageId)) return state;
          const pendingByMessage = new Set(state.pendingByMessage);
          pendingByMessage.delete(messageId);
          return { pendingByMessage };
        });
      }, PENDING_TIMEOUT_MS),
    );

    set((state) => {
      if (state.pendingByMessage.has(messageId)) return state;
      const pendingByMessage = new Set(state.pendingByMessage);
      pendingByMessage.add(messageId);
      return { pendingByMessage };
    });
  },

  isPending: (messageId) => {
    return get().pendingByMessage.has(messageId);
  },

  clearAll: () => {
    for (const timer of pendingTimers.values()) clearTimeout(timer);
    pendingTimers.clear();
    set({ entitiesByMessage: new Map(), pendingByMessage: new Set() });
  },
}));
