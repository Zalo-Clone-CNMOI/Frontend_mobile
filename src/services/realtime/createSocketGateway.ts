import { io, Socket } from "socket.io-client";
import {
  AccessTokenProvider,
  RefreshAccessTokenProvider,
  RealtimeHostConfig,
} from "../../types/realtimeBff";
import { NETWORK_CONFIG } from "../../config/network";

// Extract host from NETWORK_CONFIG (remove http:// and port)
const extractHost = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
};

const DEFAULT_HOST = extractHost(NETWORK_CONFIG.SOCKET_URL);
const DEFAULT_WS_PORT = Number(NETWORK_CONFIG.SOCKET_URL.split(':')[2] || '3001');

export type CreateSocketGatewayOptions = RealtimeHostConfig & {
  getAccessToken: AccessTokenProvider;
  refreshAccessToken?: RefreshAccessTokenProvider;
  autoConnect?: boolean;
};

const buildWsUrl = ({
  host = DEFAULT_HOST,
  wsPort = DEFAULT_WS_PORT,
}: RealtimeHostConfig) => `ws://${host}:${wsPort}`;

export const createSocketGateway = async ({
  host = DEFAULT_HOST,
  wsPort = DEFAULT_WS_PORT,
  getAccessToken,
  refreshAccessToken,
  autoConnect = true,
}: CreateSocketGatewayOptions): Promise<Socket> => {
  const accessToken = await getAccessToken();
  const socket = io(buildWsUrl({ host, wsPort }), {
    auth: {
      token: accessToken || "",
    },
    transports: ["websocket", "polling"],
    autoConnect,
    reconnection: true,
    path: "/socket.io",
  });

  if (refreshAccessToken) {
    socket.on("connect_error", async (error) => {
      const message = String(error?.message || "").toLowerCase();
      if (!message.includes("unauthorized")) return;

      const nextToken = await refreshAccessToken();
      if (!nextToken) return;

      socket.auth = {
        token: nextToken,
      };

      if (!socket.connected) {
        socket.connect();
      }
    });
  }

  return socket;
};
