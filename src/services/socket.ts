import { io, Socket } from "socket.io-client";
import { getCurrentToken, refreshAccessToken } from "./authService";

const WS_HOST = "ws://175.41.136.189:3001";

let socket: Socket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export const createSocket = async (): Promise<Socket> => {
  if (socket) return socket;

  const token = await getCurrentToken();

  socket = io(WS_HOST, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    auth: { token },
  });

  socket.on("connect", () => {
    console.log("Socket connected", socket?.id);
    startHeartbeat();
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    stopHeartbeat();
  });

  socket.on("connect_error", async (err: any) => {
    console.warn("Socket connect_error", err?.message || err);
    const message = (err && (err.message || err)) || "";
    if (
      message.toLowerCase().includes("unauthor") ||
      (err && err.data && err.data.type === "Unauthorized")
    ) {
      try {
        const newToken = await refreshAccessToken();
        if (newToken && socket) {
          socket.auth = { token: newToken } as any;
          socket.connect();
        }
      } catch (e) {
        console.error("Failed to refresh token from socket connect_error:", e);
      }
    }
  });

  return socket;
};

export const connectSocket = async () => {
  const s = await createSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  stopHeartbeat();
};

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    try {
      socket?.emit("presence:heartbeat", { ts: Date.now() });
    } catch (e) {
      console.warn("Heartbeat emit failed", e);
    }
  }, 30_000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer as any);
    heartbeatTimer = null;
  }
}

export const getSocket = () => socket;

export default {
  createSocket,
  connectSocket,
  disconnectSocket,
  getSocket,
};
