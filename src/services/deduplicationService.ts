import type { ChatMessage } from "../types/chat";

/**
 * DeduplicationService - Centralized deduplication logic for socket events
 * 
 * Features:
 * - Global message ID cache with LRU eviction
 * - Store-based duplicate detection
 * - Event-level deduplication with TTL
 * - Thread-safe operations
 */

interface DeduplicationOptions {
  maxCacheSize?: number;
  eventTtlMs?: number;
}

interface DeduplicationResult {
  isDuplicate: boolean;
  source: "cache" | "store" | "none";
}

class DeduplicationService {
  private processedMessageIds: Set<string> = new Set();
  private processedEvents: Map<string, number> = new Map();
  private maxCacheSize: number;
  private eventTtlMs: number;

  constructor(options: DeduplicationOptions = {}) {
    this.maxCacheSize = options.maxCacheSize ?? 1000;
    this.eventTtlMs = options.eventTtlMs ?? 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Check if a message/event has been processed and mark it as processed
   * Returns true if it's a duplicate
   */
  checkAndMark(
    messageId: string,
    options?: {
      conversationId?: string;
      checkStore?: () => boolean | Promise<boolean>;
    }
  ): boolean | Promise<boolean> {
    // Check global cache first
    if (this.isProcessed(messageId)) {
      return true;
    }

    // If store check is provided, do it
    if (options?.checkStore) {
      const storeResult = options.checkStore();
      if (storeResult instanceof Promise) {
        return storeResult.then((exists) => {
          if (exists) {
            return true;
          }
          this.markProcessed(messageId);
          return false;
        });
      }
      if (storeResult) {
        return true;
      }
    }

    this.markProcessed(messageId);
    return false;
  }

  /**
   * Check if a message ID has been processed (without marking)
   */
  isProcessed(messageId: string): boolean {
    return this.processedMessageIds.has(messageId);
  }

  /**
   * Mark a message ID as processed
   */
  markProcessed(messageId: string): void {
    if (!messageId) return;

    this.processedMessageIds.add(messageId);

    // LRU eviction: remove oldest when exceeding max size
    if (this.processedMessageIds.size > this.maxCacheSize) {
      const firstId = this.processedMessageIds.values().next().value;
      if (firstId) {
        this.processedMessageIds.delete(firstId);
      }
    }
  }

  /**
   * Check if an event has been processed (with TTL)
   */
  isEventProcessed(eventId: string): boolean {
    this.cleanupExpiredEvents();
    return this.processedEvents.has(eventId);
  }

  /**
   * Mark an event as processed
   */
  markEventProcessed(eventId: string): void {
    if (!eventId) return;
    this.processedEvents.set(eventId, Date.now());
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.processedMessageIds.clear();
    this.processedEvents.clear();
  }

  /**
   * Get cache stats
   */
  getStats(): { messageIds: number; events: number } {
    return {
      messageIds: this.processedMessageIds.size,
      events: this.processedEvents.size,
    };
  }

  private cleanupExpiredEvents(): void {
    const now = Date.now();
    for (const [eventId, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.eventTtlMs) {
        this.processedEvents.delete(eventId);
      }
    }
  }
}

// Global singleton instance
let globalDeduplicationService: DeduplicationService | null = null;

export const getDeduplicationService = (): DeduplicationService => {
  if (!globalDeduplicationService) {
    globalDeduplicationService = new DeduplicationService();
  }
  return globalDeduplicationService;
};

export const initDeduplicationService = (
  options?: DeduplicationOptions
): DeduplicationService => {
  globalDeduplicationService = new DeduplicationService(options);
  return globalDeduplicationService;
};

// Legacy exports for backward compatibility
export const addProcessedMessageId = (messageId: string): void => {
  getDeduplicationService().markProcessed(messageId);
};

export const isMessageProcessed = (messageId: string): boolean => {
  return getDeduplicationService().isProcessed(messageId);
};

export { DeduplicationService };
export type { DeduplicationOptions, DeduplicationResult };
