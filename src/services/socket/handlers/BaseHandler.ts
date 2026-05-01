import type { Socket } from "socket.io-client";
import { getDeduplicationService } from "../../deduplicationService";

/**
 * BaseHandler - Abstract base class for all socket event handlers
 * 
 * Provides:
 * - Event registration/unregistration
 * - Deduplication support
 * - Lifecycle hooks (onRegister, onUnregister)
 * - Logging utilities
 */

export interface HandlerContext {
  socket: Socket;
  dedupService: ReturnType<typeof getDeduplicationService>;
}

export abstract class BaseHandler {
  protected socket: Socket | null = null;
  protected dedupService = getDeduplicationService();
  protected registered = false;
  protected handlerWrappers: Map<string, (...args: unknown[]) => void> = new Map();

  /**
   * Event names this handler listens to
   * Override in subclass
   */
  abstract readonly events: string[];

  /**
   * Handler name for logging
   * Override in subclass
   */
  abstract readonly name: string;

  /**
   * Register this handler to socket events
   */
  register(socket: Socket): void {
    if (this.registered) {
      console.warn(`[${this.name}] Already registered, skipping`);
      return;
    }

    this.socket = socket;
    
    for (const event of this.events) {
      const handler = this.createHandler(event);
      this.handlerWrappers.set(event, handler);
      socket.on(event, handler);
    }

    this.registered = true;
    this.onRegister();
    console.log(`[${this.name}] Registered ${this.events.length} event(s)`);
  }

  /**
   * Unregister this handler from socket events
   */
  unregister(): void {
    if (!this.socket || !this.registered) {
      return;
    }

    for (const [event, handler] of this.handlerWrappers.entries()) {
      this.socket.off(event, handler);
    }

    this.handlerWrappers.clear();
    this.registered = false;
    this.onUnregister();
    console.log(`[${this.name}] Unregistered`);
  }

  /**
   * Create handler function for specific event
   * Override in subclass to implement event handling
   */
  protected abstract createHandler(event: string): (...args: unknown[]) => void;

  /**
   * Lifecycle hook called after registration
   * Override in subclass if needed
   */
  protected onRegister(): void {
    // Override in subclass
  }

  /**
   * Lifecycle hook called after unregistration
   * Override in subclass if needed
   */
  protected onUnregister(): void {
    // Override in subclass
  }

  /**
   * Check if event is duplicate and mark it
   */
  protected checkAndMarkEvent(eventId: string): boolean {
    if (this.dedupService.isEventProcessed(eventId)) {
      return true;
    }
    this.dedupService.markEventProcessed(eventId);
    return false;
  }

  /**
   * Check if message is duplicate and mark it with optional store check
   */
  protected async checkAndMarkMessage(
    messageId: string,
    options?: {
      conversationId?: string;
      checkStore?: () => boolean | Promise<boolean>;
    }
  ): Promise<boolean> {
    return this.dedupService.checkAndMark(messageId, options);
  }

  /**
   * Log with handler name prefix
   */
  protected log(...args: unknown[]): void {
    console.log(`[${this.name}]`, ...args);
  }

  /**
   * Log error with handler name prefix
   */
  protected error(...args: unknown[]): void {
    console.error(`[${this.name}]`, ...args);
  }

  /**
   * Check if handler is registered
   */
  isRegistered(): boolean {
    return this.registered;
  }
}
