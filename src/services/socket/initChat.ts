import { getSocket } from "../socket";
import { getHandlerRegistry } from "./HandlerRegistry";
import {
  ChatMessageHandler,
  ChatReactionHandler,
  ChatSystemHandler,
  SocketAckHandler,
} from "./handlers";

// Track initialization state
let initialized = false;
let handlersRegistered = false;

/**
 * Initialize chat socket handlers using HandlerRegistry pattern
 * This replaces the old registerSocketListeners function
 */
export function initChat(): () => void {
  if (initialized && handlersRegistered) {
    console.log("[initChat] Already initialized, skipping");
    return () => {};
  }

  const socket = getSocket();
  if (!socket) {
    console.warn("[initChat] Socket not available");
    return () => {};
  }

  const registry = getHandlerRegistry();

  // Register handlers if not already done
  if (!handlersRegistered) {
    console.log("[initChat] Registering socket handlers");

    // Register all chat-related handlers
    registry.register(new ChatMessageHandler());
    registry.register(new ChatReactionHandler());
    registry.register(new ChatSystemHandler());
    registry.register(new SocketAckHandler());

    handlersRegistered = true;
  }

  // Set socket in registry (will auto-register handlers to socket)
  registry.setSocket(socket);

  initialized = true;

  // Re-join open conversations on reconnect
  socket.on("connect", () => {
    console.log("[initChat] Socket connected, rejoining conversations");
    // Note: Open conversations tracking would need to be moved to a shared module
  });

  console.log("[initChat] Initialization complete");

  // Return cleanup function
  return () => {
    console.log("[initChat] Cleaning up");
    registry.unregisterAll();
    handlersRegistered = false;
    initialized = false;
  };
}

/**
 * Check if chat is initialized
 */
export function isChatInitialized(): boolean {
  return initialized;
}

/**
 * Reset chat initialization state
 */
export function resetChatInit(): void {
  initialized = false;
  handlersRegistered = false;
}
