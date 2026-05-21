import { AxiosInstance } from 'axios';
import { Socket } from 'socket.io-client';
import api from '../http';
import { createSocket, getSocket } from '../socket';

let httpClientInstance: AxiosInstance | null = null;

/**
 * Single shared Socket.IO connection (see services/socket.ts).
 * Previously this module opened a second connection, so chat:join rooms
 * did not receive call:started on the socket where CallHandler listens.
 */
export const getRealtimeHttpClient = () => {
  if (!httpClientInstance) {
    httpClientInstance = api;
  }
  return httpClientInstance;
};

export const getRealtimeSocket = async (): Promise<Socket> => {
  return createSocket();
};

export const resetRealtimeClients = async () => {
  httpClientInstance = null;
  // Socket disconnect is handled by disconnectSocket() in AuthContext
  const socket = getSocket();
  if (socket) {
    socket.removeAllListeners('friend:request:send');
    socket.removeAllListeners('friend:request:respond');
    socket.removeAllListeners('friend:request:cancel');
    socket.removeAllListeners('friend:removed');
  }
};
