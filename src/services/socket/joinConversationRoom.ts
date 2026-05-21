import { createSocket, getSocket } from '../socket';

export async function joinConversationRoom(conversationId: string): Promise<void> {
  const normalizedId = String(conversationId || '').trim();
  if (!normalizedId) return;

  const socket = getSocket() || (await createSocket());
  if (!socket?.connected) {
    console.warn('[Socket] Cannot join room — socket not connected:', normalizedId);
    return;
  }

  socket.emit('chat:join', { conversation_id: normalizedId });
  console.log('[Socket] Joined conversation room:', normalizedId);
}
