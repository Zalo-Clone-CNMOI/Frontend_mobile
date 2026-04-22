import { AxiosInstance } from "axios";
import { Socket } from "socket.io-client";
import { getCurrentToken, refreshAccessToken } from "../authService";
import { createBffHttpClient } from "./createBffHttpClient";
import { createSocketGateway } from "./createSocketGateway";
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

const API_HOST = extractHost(NETWORK_CONFIG.API_BASE_URL);
const API_PORT = NETWORK_CONFIG.API_BASE_URL.split(':')[2]?.split('/')[0] || '5000';

let httpClientInstance: AxiosInstance | null = null;
let socketInstance: Socket | null = null;
let socketInstancePromise: Promise<Socket> | null = null;

export const getRealtimeHttpClient = () => {
  if (!httpClientInstance) {
    httpClientInstance = createBffHttpClient({
      host: API_HOST,
      httpPort: Number(API_PORT),
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
      host: API_HOST,
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
