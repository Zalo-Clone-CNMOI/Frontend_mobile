import { io, Socket } from "socket.io-client";
import { NETWORK_CONFIG } from "../config/network";
import { getCurrentToken, refreshAccessToken } from "./authService";

const WS_URL = NETWORK_CONFIG.SOCKET_URL;

let socket: Socket | null = null;

// NOTE: Heartbeat is now handled by usePresenceHeartbeat hook to avoid duplicate timers
// This file only manages socket connection lifecycle

const withBearer = (token: string | null) => (token ? `Bearer ${token}` : "");

export const createSocket = async (): Promise<Socket> => {
  if (socket && socket.connected) {
    console.log('[Socket] Reusing existing socket', socket.id);
    return socket;
  }

  if (socket && !socket.connected) {
    console.log('[Socket] Reconnecting existing socket');
    socket.connect();
    return socket;
  }

  const accessToken = await getCurrentToken();
  const bearerToken = withBearer(accessToken);

  console.log('[Socket] Creating new socket connection to', WS_URL);

  socket = io(WS_URL, {
    auth: { token: bearerToken },
    extraHeaders: accessToken ? { Authorization: bearerToken } : {},
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    path: "/socket.io",
  });

  socket.on("connect", () => {
    console.log('[Socket] Connected successfully', socket?.id);
  });

  // Debug: Log all incoming events
  socket.onAny((eventName, ...args) => {
    console.log(`[Socket] ⬇️ Incoming event: ${eventName}`, args);
  });

  // Debug: Log connection status changes
  socket.io.on("reconnect", (attempt) => {
    console.log('[Socket] Reconnected after', attempt, 'attempts');
  });

  socket.io.on("reconnect_attempt", (attempt) => {
    console.log('[Socket] Reconnect attempt', attempt);
  });

  socket.io.on("error", (error) => {
    console.error('[Socket] Error:', error);
  });

  socket.on("disconnect", (reason) => {
    console.log('[Socket] Disconnected', reason);
  });

  socket.on("connect_error", async (err: any) => {
    console.error('[Socket] Connect error', err);
    const message = String(err?.message || "").toLowerCase();
    if (!message.includes("unauthorized")) return;

    try {
      console.log('[Socket] Attempting token refresh');
      const newToken = await refreshAccessToken();
      if (!newToken || !socket) return;

      const newBearer = withBearer(newToken);
      socket.auth = { token: newBearer };
      if (socket.io.opts.extraHeaders) {
        socket.io.opts.extraHeaders.Authorization = newBearer;
      }

      console.log('[Socket] Reconnecting with new token');
      socket.connect();
    } catch (refreshErr) {
      console.error('[Socket] Token refresh failed', refreshErr);
    }
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket] Disconnecting socket');
    socket.disconnect();
    socket = null;
  }
};

export const connectSocket = createSocket;
