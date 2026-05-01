import { io, Socket } from "socket.io-client";
import { NETWORK_CONFIG } from "../config/network";
import {
  SOCKET_RECONNECT_DELAY_MAX_MS,
  SOCKET_RECONNECT_DELAY_MS,
} from "../constants/realtime";
import { logError } from "./errorService";
import { getCurrentToken, refreshAccessToken } from "./authService";

const WS_URL = NETWORK_CONFIG.SOCKET_URL;

let socket: Socket | null = null;
let isConnecting = false;
let connectionPromise: Promise<Socket> | null = null;

// NOTE: Heartbeat is now handled by usePresenceHeartbeat hook to avoid duplicate timers
// This file only manages socket connection lifecycle

const withBearer = (token: string | null) => (token ? `Bearer ${token}` : "");

export const createSocket = async (): Promise<Socket> => {
  // Prevent multiple simultaneous connections
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  if (socket && socket.connected) {
    // Reusing existing socket
    return socket;
  }

  if (socket && !socket.connected) {
    // Reconnecting existing socket
    socket.connect();
    return socket;
  }

  isConnecting = true;
  connectionPromise = (async () => {
    const accessToken = await getCurrentToken();
    const bearerToken = withBearer(accessToken);

    console.log('[Socket] Creating new socket connection to', WS_URL);

    socket = io(WS_URL, {
      auth: { token: bearerToken },
      extraHeaders: accessToken ? { Authorization: bearerToken } : {},
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: SOCKET_RECONNECT_DELAY_MS,
      reconnectionDelayMax: SOCKET_RECONNECT_DELAY_MAX_MS,
      reconnectionAttempts: Infinity,
      path: "/socket.io",
    });

    socket.on("connect", () => {
      console.log('[Socket] Connected successfully', socket?.id);
      isConnecting = false;
      connectionPromise = null;
    });

    socket.on("disconnect", () => {
      console.log('[Socket] Disconnected');
      isConnecting = false;
      connectionPromise = null;
    });

    socket.on("connect_error", async (err: Error) => {
      logError('Socket', err);
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
        logError('Socket', refreshErr, { reason: 'token_refresh_failed' });
      }
    });

    return socket;
  })().finally(() => {
    isConnecting = false;
    connectionPromise = null;
  });

  return connectionPromise;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket] Disconnecting socket');
    socket.disconnect();
    socket = null;
    isConnecting = false;
    connectionPromise = null;
  }
};

export const connectSocket = createSocket;
