import { io, Socket } from "socket.io-client";
import {
  AccessTokenProvider,
  RefreshAccessTokenProvider,
  RealtimeHostConfig,
} from "../../types/realtimeBff";

const DEFAULT_HOST = process.env.EXPO_PUBLIC_API_HOST || "54.179.206.215";
const DEFAULT_WS_PORT = 3001;

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
    transports: ["websocket"],
    autoConnect,
    reconnection: true,
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
