import { getSocket, createSocket } from "../socket";
import { getCurrentToken, refreshAccessToken } from "../authService";
import type { Socket } from "socket.io-client";

function decodeJwt(token: string): { exp?: number } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function withBearer(token: string | null) {
  return token ? `Bearer ${token}` : "";
}

function waitForConnection(socket: Socket, timeoutMs = 5000): Promise<boolean> {
  if (socket.connected) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    const onConnect = () => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      resolve(true);
    };
    socket.on("connect", onConnect);
  });
}

export async function ensureFreshSocketAuth(): Promise<boolean> {
  const token = await getCurrentToken();
  if (!token) return false;

  const decoded = decodeJwt(token);
  const now = Math.floor(Date.now() / 1000);
  const needsRefresh = decoded?.exp ? decoded.exp < now + 60 : false;

  let currentToken = token;
  let didRefresh = needsRefresh;

  if (needsRefresh) {
    try {
      const newToken = await refreshAccessToken();
      if (!newToken) return false;
      currentToken = newToken;
    } catch {
      return false;
    }
  }

  let socket = getSocket();
  if (!socket) {
    socket = await createSocket();
  }

  if (!socket) {
    return false;
  }

  const bearer = withBearer(currentToken);
  socket.auth = { token: bearer };
  if (socket.io.opts.extraHeaders) {
    socket.io.opts.extraHeaders.Authorization = bearer;
  }

  if (!socket.connected) {
    socket.connect();
  } else if (didRefresh) {
    socket.disconnect().connect();
  }

  return waitForConnection(socket);
}
