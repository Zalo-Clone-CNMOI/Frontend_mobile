import type { Socket } from "socket.io-client";
import { BaseHandler } from "./handlers/BaseHandler";

/**
 * HandlerRegistry - Central registry for all socket event handlers
 * 
 * Features:
 * - Register/unregister multiple handlers at once
 * - Automatic cleanup on socket disconnect
 * - Handler lifecycle management
 * - Debug/logging utilities
 */

export class HandlerRegistry {
  private handlers: Map<string, BaseHandler> = new Map();
  private socket: Socket | null = null;
  private registered = false;

  /**
   * Register a handler
   */
  register(handler: BaseHandler): void {
    if (this.handlers.has(handler.name)) {
      console.warn(`[HandlerRegistry] Handler ${handler.name} already registered, replacing`);
      this.handlers.get(handler.name)?.unregister();
    }

    if (this.socket) {
      handler.register(this.socket);
    }

    this.handlers.set(handler.name, handler);
  }

  /**
   * Unregister a handler by name
   */
  unregister(handlerName: string): void {
    const handler = this.handlers.get(handlerName);
    if (handler) {
      handler.unregister();
      this.handlers.delete(handlerName);
    }
  }

  /**
   * Unregister all handlers
   */
  unregisterAll(): void {
    for (const [name, handler] of this.handlers.entries()) {
      handler.unregister();
    }
    this.handlers.clear();
  }

  /**
   * Set socket and register all handlers to it
   */
  setSocket(socket: Socket): void {
    const socketChanged = this.socket !== socket;

    if (socketChanged && this.socket) {
      for (const handler of this.handlers.values()) {
        if (handler.isRegistered()) {
          handler.unregister();
        }
      }
    }

    this.socket = socket;

    for (const handler of this.handlers.values()) {
      if (!handler.isRegistered() || socketChanged) {
        handler.register(socket);
      }
    }
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Get handler by name
   */
  getHandler(name: string): BaseHandler | undefined {
    return this.handlers.get(name);
  }

  /**
   * Check if handler is registered
   */
  hasHandler(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * Get all registered handler names
   */
  getHandlerNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get registry stats
   */
  getStats(): {
    totalHandlers: number;
    registeredHandlers: number;
    handlerNames: string[];
  } {
    return {
      totalHandlers: this.handlers.size,
      registeredHandlers: Array.from(this.handlers.values()).filter(h => h.isRegistered()).length,
      handlerNames: this.getHandlerNames(),
    };
  }

  /**
   * Reset registry - unregister all and clear
   */
  reset(): void {
    this.unregisterAll();
    this.socket = null;
  }
}

// Global singleton instance
let globalHandlerRegistry: HandlerRegistry | null = null;

/**
 * Get or create global handler registry
 */
export const getHandlerRegistry = (): HandlerRegistry => {
  if (!globalHandlerRegistry) {
    globalHandlerRegistry = new HandlerRegistry();
  }
  return globalHandlerRegistry;
};

/**
 * Reset global handler registry (for testing/logout)
 */
export const resetHandlerRegistry = (): void => {
  globalHandlerRegistry?.reset();
  globalHandlerRegistry = null;
};
