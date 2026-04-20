/**
 * Presence Heartbeat Hook
 * Emits presence:heartbeat every 25s when connected
 * Handles presence:update from server
 */

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import {
  WsEvents,
  type PresenceUpdatePayload,
  type WsErrorPayload,
} from './events';

const HEARTBEAT_INTERVAL_MS = 25_000; // 25 seconds

interface UsePresenceHeartbeatParams {
  socket: Socket | null;
  onPresenceUpdate: (payload: PresenceUpdatePayload) => void;
  onUnauthorized?: () => void;
}

export function usePresenceHeartbeat({
  socket,
  onPresenceUpdate,
  onUnauthorized,
}: UsePresenceHeartbeatParams): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!socket) return;

    const sendHeartbeat = () => {
      socket.emit(WsEvents.PresenceHeartbeat, { ts: Date.now() });
    };

    const handleConnect = () => {
      sendHeartbeat();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    };

    const handleDisconnect = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const handlePresenceUpdate = (payload: PresenceUpdatePayload) => {
      onPresenceUpdate(payload);
    };

    const handleWsError = (payload: WsErrorPayload) => {
      if (payload.code === 'UNAUTHORIZED') {
        handleDisconnect();
        onUnauthorized?.();
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on(WsEvents.PresenceUpdate, handlePresenceUpdate);
    socket.on(WsEvents.WsError, handleWsError);

    // If already connected, start heartbeat immediately
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off(WsEvents.PresenceUpdate, handlePresenceUpdate);
      socket.off(WsEvents.WsError, handleWsError);
      handleDisconnect();
    };
  }, [socket, onPresenceUpdate, onUnauthorized]);
}
