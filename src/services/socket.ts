import { io, Socket } from "socket.io-client";
import { NETWORK_CONFIG } from "../config/network";
import { getCurrentToken, refreshAccessToken } from "./authService";

const WS_URL = NETWORK_CONFIG.SOCKET_URL;

let socket: Socket | null = null;

const withBearer = (token: string | null) => (token ? `Bearer ${token}` : "");

export const createSocket = async (): Promise<Socket> => {
  if (socket) return socket;

  const accessToken = await getCurrentToken();
  const bearerToken = withBearer(accessToken);
  
  socket = io(WS_URL, {
    auth: { token: bearerToken },
    extraHeaders: accessToken ? { Authorization: bearerToken } : {},
    transports: ["websocket", "polling"],
    reconnection: true,
  });

  socket.on("connect", () => {
    console.log("🔌 WebSocket connected:", socket?.id);
  });

  socket.on("connect_error", async (err: any) => {
    const message = String(err?.message || "").toLowerCase();
    if (!message.includes("unauthorized")) return;

    try {
      const newToken = await refreshAccessToken();
      if (!newToken || !socket) return;
      
      const newBearer = withBearer(newToken);
      socket.auth = { token: newBearer };
      if (socket.io.opts.extraHeaders) {
        socket.io.opts.extraHeaders.Authorization = newBearer;
      }
      
      socket.connect();
    } catch (refreshErr) {
      console.warn("🔌 Socket token refresh failed:", refreshErr);
    }
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Export alias for backward compatibility
export const connectSocket = createSocket;
