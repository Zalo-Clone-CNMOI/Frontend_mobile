import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/socket';
import { usePollStore } from '../store/usePollStore';
import { WsEvents } from '../realtime/events';
import type {
  GroupPollCreatedPayload,
  GroupPollEditedPayload,
  GroupPollVoteUpdatedPayload,
  GroupPollOptionAddedPayload,
  GroupPollOptionRemovedPayload,
  GroupPollClosedPayload,
} from '../realtime/events';

/**
 * Hook để lắng nghe socket events liên quan đến polls và tự động cập nhật UI
 * Khi nhận được socket event, hook sẽ gọi API để refresh dữ liệu mới nhất
 */
export const usePollSocket = () => {
  const { user } = useAuth();
  const {
    fetchPollDetail,
    fetchPolls,
    handlePollCreated,
    handlePollEdited,
    handlePollVoteUpdated,
    handlePollOptionAdded,
    handlePollOptionRemoved,
    handlePollClosed,
  } = usePollStore();

  // Xử lý khi poll được tạo - gọi API để lấy danh sách polls mới nhất
  const handlePollCreatedWithRefresh = useCallback(async (payload: GroupPollCreatedPayload) => {
    console.log('[PollSocket] Poll created, refreshing polls list:', payload.poll_id);
    
    // Cập nhật store với metadata từ socket event
    handlePollCreated(payload);
    
    // Gọi API để lấy danh sách polls mới nhất cho conversation
    try {
      await fetchPolls(payload.conversation_id);
    } catch (error) {
      console.error('[PollSocket] Error fetching polls after creation:', error);
    }
  }, [handlePollCreated, fetchPolls]);

  // Xử lý khi poll được edited - gọi API để lấy poll detail mới nhất
  const handlePollEditedWithRefresh = useCallback(async (payload: GroupPollEditedPayload) => {
    console.log('[PollSocket] Poll edited, refreshing poll detail:', payload.poll_id);
    
    // Cập nhật store với thay đổi từ socket event
    handlePollEdited(payload);
    
    // Gọi API để lấy poll detail mới nhất
    try {
      await fetchPollDetail(payload.conversation_id, payload.poll_id, true); // force refresh
    } catch (error) {
      console.error('[PollSocket] Error fetching poll detail after edit:', error);
    }
  }, [handlePollEdited, fetchPollDetail]);

  // Xử lý khi có vote mới - gọi API để lấy poll detail mới nhất
  const handlePollVoteUpdatedWithRefresh = useCallback(async (payload: GroupPollVoteUpdatedPayload) => {
    console.log('[PollSocket] Poll vote updated, refreshing poll detail:', payload.poll_id);
    
    // Cập nhật store với vote counts từ socket event
    handlePollVoteUpdated(payload);
    
    // Gọi API để lấy poll detail mới nhất (vì tally có thể không đầy đủ)
    try {
      await fetchPollDetail(payload.conversation_id, payload.poll_id, true); // force refresh
    } catch (error) {
      console.error('[PollSocket] Error fetching poll detail after vote update:', error);
    }
  }, [handlePollVoteUpdated, fetchPollDetail]);

  // Xử lý khi option được thêm - gọi API để lấy poll detail mới nhất
  const handlePollOptionAddedWithRefresh = useCallback(async (payload: GroupPollOptionAddedPayload) => {
    console.log('[PollSocket] Poll option added, refreshing poll detail:', payload.poll_id);
    
    // Cập nhật store với option mới từ socket event
    handlePollOptionAdded(payload);
    
    // Gọi API để lấy poll detail mới nhất
    try {
      await fetchPollDetail(payload.conversation_id, payload.poll_id, true); // force refresh
    } catch (error) {
      console.error('[PollSocket] Error fetching poll detail after option added:', error);
    }
  }, [handlePollOptionAdded, fetchPollDetail]);

  // Xử lý khi option bị xóa - gọi API để lấy poll detail mới nhất
  const handlePollOptionRemovedWithRefresh = useCallback(async (payload: GroupPollOptionRemovedPayload) => {
    console.log('[PollSocket] Poll option removed, refreshing poll detail:', payload.poll_id);
    
    // Cập nhật store với option bị xóa từ socket event
    handlePollOptionRemoved(payload);
    
    // Gọi API để lấy poll detail mới nhất
    try {
      await fetchPollDetail(payload.conversation_id, payload.poll_id, true); // force refresh
    } catch (error) {
      console.error('[PollSocket] Error fetching poll detail after option removed:', error);
    }
  }, [handlePollOptionRemoved, fetchPollDetail]);

  // Xử lý khi poll bị đóng - gọi API để lấy poll detail mới nhất
  const handlePollClosedWithRefresh = useCallback(async (payload: GroupPollClosedPayload) => {
    console.log('[PollSocket] Poll closed, refreshing poll detail:', payload.poll_id);
    
    // Cập nhật store với poll closed status từ socket event
    handlePollClosed(payload);
    
    // Gọi API để lấy poll detail mới nhất (vì cần final tally)
    try {
      await fetchPollDetail(payload.conversation_id, payload.poll_id, true); // force refresh
    } catch (error) {
      console.error('[PollSocket] Error fetching poll detail after poll closed:', error);
    }
  }, [handlePollClosed, fetchPollDetail]);

  useEffect(() => {
    if (!user?.id) {
      console.log('[PollSocket] User not available, skipping socket setup');
      return;
    }

    const socket = getSocket();
    if (!socket) {
      console.log('[PollSocket] Socket not available, skipping setup');
      return;
    }

    console.log('[PollSocket] Setting up poll socket listeners for user:', user.id);

    // Đăng ký listeners cho tất cả poll events
    socket.on(WsEvents.GroupPollCreated, handlePollCreatedWithRefresh);
    socket.on(WsEvents.GroupPollEdited, handlePollEditedWithRefresh);
    socket.on(WsEvents.GroupPollVoteUpdated, handlePollVoteUpdatedWithRefresh);
    socket.on(WsEvents.GroupPollOptionAdded, handlePollOptionAddedWithRefresh);
    socket.on(WsEvents.GroupPollOptionRemoved, handlePollOptionRemovedWithRefresh);
    socket.on(WsEvents.GroupPollClosed, handlePollClosedWithRefresh);

    // Cleanup function
    return () => {
      console.log('[PollSocket] Cleaning up poll socket listeners');
      socket.off(WsEvents.GroupPollCreated, handlePollCreatedWithRefresh);
      socket.off(WsEvents.GroupPollEdited, handlePollEditedWithRefresh);
      socket.off(WsEvents.GroupPollVoteUpdated, handlePollVoteUpdatedWithRefresh);
      socket.off(WsEvents.GroupPollOptionAdded, handlePollOptionAddedWithRefresh);
      socket.off(WsEvents.GroupPollOptionRemoved, handlePollOptionRemovedWithRefresh);
      socket.off(WsEvents.GroupPollClosed, handlePollClosedWithRefresh);
    };
  }, [
    user?.id,
    handlePollCreatedWithRefresh,
    handlePollEditedWithRefresh,
    handlePollVoteUpdatedWithRefresh,
    handlePollOptionAddedWithRefresh,
    handlePollOptionRemovedWithRefresh,
    handlePollClosedWithRefresh,
  ]);
};

export default usePollSocket;
