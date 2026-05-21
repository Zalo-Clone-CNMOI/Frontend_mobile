import { io, Socket } from "socket.io-client";
import {
  AccessTokenProvider,
  RefreshAccessTokenProvider,
  RealtimeHostConfig,
} from "../../types/realtimeBff";
import { NETWORK_CONFIG } from "../../config/network";

export type CreateSocketGatewayOptions = RealtimeHostConfig & {
  getAccessToken: AccessTokenProvider;
  refreshAccessToken?: RefreshAccessTokenProvider;
  autoConnect?: boolean;
};

const withBearer = (token: string | null) => (token ? `Bearer ${token}` : "");

export const createSocketGateway = async ({
  getAccessToken,
  refreshAccessToken,
  autoConnect = true,
}: CreateSocketGatewayOptions): Promise<Socket> => {
  const accessToken = await getAccessToken();
  const bearerToken = withBearer(accessToken);

  const socket = io(NETWORK_CONFIG.SOCKET_URL, {
    auth: { token: bearerToken },
    extraHeaders: accessToken ? { Authorization: bearerToken } : {},
    transports: ["websocket", "polling"],
    autoConnect,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    path: "/socket.io",
  });

  if (refreshAccessToken) {
    socket.on("connect_error", async (error) => {
      const message = String(error?.message || "").toLowerCase();
      if (!message.includes("unauthorized")) return;

      const nextToken = await refreshAccessToken();
      if (!nextToken) return;

      const bearer = withBearer(nextToken);
      socket.auth = { token: bearer };
      if (socket.io.opts.extraHeaders) {
        socket.io.opts.extraHeaders.Authorization = bearer;
      }

      if (!socket.connected) {
        socket.connect();
      }
    });
  }

  return socket;
};
