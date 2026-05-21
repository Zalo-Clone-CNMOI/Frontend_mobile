import { getSocket } from "../socket";
import { getHandlerRegistry } from "./HandlerRegistry";
import {
  ChatMessageHandler,
  ChatReactionHandler,
  ChatSystemHandler,
  CallHandler,
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

  const registry = getHandlerRegistry();

  // Register handlers even if socket isn't available yet.
  // Handlers will be bound to socket when it becomes available.
  if (!handlersRegistered) {
    console.log("[initChat] Registering socket handlers");

    registry.register(new ChatMessageHandler());
    registry.register(new ChatReactionHandler());
    registry.register(new ChatSystemHandler());
    registry.register(new CallHandler());
    registry.register(new SocketAckHandler());

    handlersRegistered = true;
  }

  const socket = getSocket();
  if (socket) {
    registry.setSocket(socket);
    initialized = true;

    socket.on("connect", () => {
      console.log("[initChat] Socket connected, rejoining conversations");
      // Re-register handlers on reconnect (in case socket was replaced)
      registry.setSocket(socket);
    });
  } else {
    console.log("[initChat] Socket not available, handlers registered. Will bind on socket connect.");
  }

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
