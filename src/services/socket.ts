import { io, Socket } from "socket.io-client";
import { NETWORK_CONFIG } from "../config/network";
import { getCurrentToken, refreshAccessToken } from "./authService";

const WS_URL = NETWORK_CONFIG.SOCKET_URL;

let socket: Socket | null = null;
let heartbeatInterval: number | null = null;

// Heartbeat interval: 30s (nhỏ hơn TTL 60s của Backend)
const HEARTBEAT_INTERVAL_MS = 30_000;

const withBearer = (token: string | null) => (token ? `Bearer ${token}` : "");

const startHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (socket?.connected) {
      socket.emit("presence:heartbeat", { ts: Date.now() });
    }
  }, HEARTBEAT_INTERVAL_MS) as unknown as number;
};

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

export const createSocket = async (): Promise<Socket> => {
  if (socket) {
    console.log('[socket] 🔌 Socket already exists, connected:', socket.connected, 'ID:', socket.id);
    return socket;
  }

  console.log('[socket] 🔌 Creating new socket connection to:', WS_URL);
  const accessToken = await getCurrentToken();
  const bearerToken = withBearer(accessToken);
  console.log('[socket] 🔌 Access token exists:', !!accessToken);

  socket = io(WS_URL, {
    auth: { token: bearerToken },
    extraHeaders: accessToken ? { Authorization: bearerToken } : {},
    transports: ["websocket", "polling"],
    reconnection: true,
  });

  console.log('[socket] 🔌 Socket instance created, connecting...');

  socket.on("connect", () => {
    console.log('[socket] ✅ Socket connected, ID:', socket?.id);
    startHeartbeat();
  });

  socket.on("disconnect", (reason: any) => {
    console.log('[socket] ❌ Socket disconnected, reason:', reason);
    stopHeartbeat();
  });

  socket.on("connect_error", async (err: any) => {
    console.error('[socket] ❌ Socket connect error:', err);
    const message = String(err?.message || "").toLowerCase();
    if (!message.includes("unauthorized")) return;

    try {
      console.log('[socket] 🔑 Refreshing access token...');
      const newToken = await refreshAccessToken();
      if (!newToken || !socket) return;

      const newBearer = withBearer(newToken);
      socket.auth = { token: newBearer };
      if (socket.io.opts.extraHeaders) {
        socket.io.opts.extraHeaders.Authorization = newBearer;
      }

      console.log('[socket] 🔑 Token refreshed, reconnecting...');
      socket.connect();
    } catch (refreshErr) {
      console.error('[socket] ❌ Failed to refresh token:', refreshErr);
    }
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  stopHeartbeat();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const connectSocket = createSocket;
