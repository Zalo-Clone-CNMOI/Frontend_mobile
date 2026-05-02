import { useEffect, useRef, useCallback } from 'react';
import { getRealtimeSocket } from '../services/realtime/defaultRealtimeClients';
import { useChatsStore } from '../store/useChatsStore';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook tự động join tất cả conversation rooms
 * Để nhận được message realtime ngay cả khi không ở trong ChatDetail
 * 
 * Backend broadcast vào room: `conv:${conversationId}`
 * Frontend cần join room này để nhận event
 */
export function useConversationRoomJoiner() {
  const { user } = useAuth();
  const userId = (user as any)?.id;
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<any>(null);

  const joinConversationRoom = useCallback(async (conversationId: string) => {
    try {
      const socket = await getRealtimeSocket();
      if (!socket || !socket.connected) {
        console.log('[RoomJoiner] Socket not connected, skipping join for:', conversationId);
        return;
      }

      if (joinedRoomsRef.current.has(conversationId)) {
        console.log('[RoomJoiner] Already joined room:', conversationId);
        return;
      }

      console.log('[RoomJoiner] Joining conversation room:', conversationId);
      socket.emit('chat:join', { conversation_id: conversationId });
      joinedRoomsRef.current.add(conversationId);
    } catch (error) {
      console.error('[RoomJoiner] Error joining room:', error);
    }
  }, []);

  const leaveConversationRoom = useCallback(async (conversationId: string) => {
    try {
      const socket = await getRealtimeSocket();
      if (!socket || !socket.connected) return;

      if (!joinedRoomsRef.current.has(conversationId)) return;

      console.log('[RoomJoiner] Leaving conversation room:', conversationId);
      socket.emit('chat:leave', { conversation_id: conversationId });
      joinedRoomsRef.current.delete(conversationId);
    } catch (error) {
      console.error('[RoomJoiner] Error leaving room:', error);
    }
  }, []);

  // Join all conversation rooms when conversations load
  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      try {
        const socket = await getRealtimeSocket();
        if (!socket) {
          console.log('[RoomJoiner] Socket not available yet');
          return;
        }

        socketRef.current = socket;

    // Get all conversations from store
    const chats = useChatsStore.getState().chats;
    const conversationIds = chats.map(chat => chat.conversationId).filter(Boolean);

    console.log('[RoomJoiner] Found', conversationIds.length, 'conversations to join');

        // Join each conversation room
        conversationIds.forEach((id) => {
          if (id && !joinedRoomsRef.current.has(id)) {
            joinConversationRoom(id);
          }
        });
      } catch (error) {
        console.error('[RoomJoiner] Error in init:', error);
      }
    };

    init();
  }, [userId, joinConversationRoom]);

  // Subscribe to store changes to join new conversations
  useEffect(() => {
    if (!userId) return;

    console.log('[RoomJoiner] Setting up store subscription');

    const unsubscribe = useChatsStore.subscribe((state) => {
      const chats = state.chats;
      const conversationIds = chats.map(chat => chat.conversationId).filter(Boolean);

      // Join new rooms
      conversationIds.forEach((id) => {
        if (id && !joinedRoomsRef.current.has(id)) {
          joinConversationRoom(id);
        }
      });

      // Optional: Leave rooms for conversations that no longer exist
      // (Usually not needed as we want to keep receiving updates)
    });

    return () => {
      console.log('[RoomJoiner] Cleaning up store subscription');
      unsubscribe();
    };
  }, [userId, joinConversationRoom]);

  // Rejoin rooms on socket reconnect
  useEffect(() => {
    const setupReconnect = async () => {
      try {
        const socket = await getRealtimeSocket();
        if (!socket) return;

        const handleConnect = () => {
          console.log('[RoomJoiner] Socket reconnected, rejoining all rooms');
          joinedRoomsRef.current.forEach((roomId) => {
            socket.emit('chat:join', { conversation_id: roomId });
          });
        };

        socket.on('connect', handleConnect);

        return () => {
          socket.off('connect', handleConnect);
        };
      } catch (error) {
        console.error('[RoomJoiner] Error setting up reconnect:', error);
      }
    };

    setupReconnect();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          const socket = await getRealtimeSocket();
          if (!socket) return;

          console.log('[RoomJoiner] Component unmounting, leaving all rooms');
          joinedRoomsRef.current.forEach((roomId) => {
            socket.emit('chat:leave', { conversation_id: roomId });
          });
          joinedRoomsRef.current.clear();
        } catch (error) {
          console.error('[RoomJoiner] Error during cleanup:', error);
        }
      };
      cleanup();
    };
  }, []);

  return {
    joinConversationRoom,
    leaveConversationRoom,
    joinedRooms: joinedRoomsRef.current,
  };
}
