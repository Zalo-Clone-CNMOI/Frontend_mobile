import { AxiosInstance } from "axios";
import { Socket } from "socket.io-client";
import { getCurrentToken, refreshAccessToken } from "../authService";
import { createBffHttpClient } from "./createBffHttpClient";
import { createSocketGateway } from "./createSocketGateway";
import { NETWORK_CONFIG } from "../../config/network";

const DEFAULT_HOST = process.env.EXPO_PUBLIC_API_HOST || "54.179.206.215";
const DEFAULT_BFF_PORT = process.env.EXPO_PUBLIC_BFF_PORT || "3000";
const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_API_PORT || "5000";

let httpClientInstance: AxiosInstance | null = null;
let socketInstance: Socket | null = null;
let socketInstancePromise: Promise<Socket> | null = null;

export const getRealtimeHttpClient = () => {
  if (!httpClientInstance) {
    httpClientInstance = createBffHttpClient({
      host: DEFAULT_HOST,
      httpPort: Number(DEFAULT_API_PORT),
      getAccessToken: getCurrentToken,
      refreshAccessToken,
    });
  }

  return httpClientInstance;
};

export const getRealtimeSocket = async () => {
  if (socketInstance) {
    return socketInstance;
  }

  if (!socketInstancePromise) {
    socketInstancePromise = createSocketGateway({
      host: DEFAULT_HOST,
      wsPort: 3001,
      getAccessToken: getCurrentToken,
      refreshAccessToken,
    }).then((socket) => {
      socketInstance = socket;
      return socket;
    });
  }

  return socketInstancePromise;
};

export const resetRealtimeClients = async () => {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  } else if (socketInstancePromise) {
    try {
      const pendingSocket = await socketInstancePromise;
      pendingSocket.removeAllListeners();
      pendingSocket.disconnect();
    } catch {
    }
  }

  socketInstancePromise = null;
  httpClientInstance = null;
};
