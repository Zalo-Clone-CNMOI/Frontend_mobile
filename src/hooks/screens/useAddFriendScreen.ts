import { useAuth } from '@/src/contexts/AuthContext';
import { sendRuntimeFriendRequest } from '@/src/services/realtime/runtimeFriendActions';
import { searchUsers, type SearchUserDTO } from '@/src/services/usersApi';
import { useRealtimeStore } from '@/src/store/useRealtimeStore';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';

export type SearchResultStatus =
  | 'none'       
  | 'friend'     
  | 'sent'       
  | 'received'   
  | 'self';      

export type SearchResult = {
  id: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  status: SearchResultStatus;
};

export function useAddFriendScreenLogic() {
  const { user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const friends = useRealtimeStore((s) => s.friends);
  const sentRequests = useRealtimeStore((s) => s.sentRequests);
  const receivedRequests = useRealtimeStore((s) => s.receivedRequests);

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);
  const sentTargetIds = useMemo(
    () => new Set(sentRequests.map((r) => r.targetUserId)),
    [sentRequests],
  );
  const receivedRequesterIds = useMemo(
    () => new Set(receivedRequests.map((r) => r.requesterId)),
    [receivedRequests],
  );

  const resolveStatus = useCallback(
    (userId: string, dto?: SearchUserDTO): SearchResultStatus => {
      if (userId === user?.id) return 'self';
      if (friendIds.has(userId)) return 'friend';
      if (sentTargetIds.has(userId)) return 'sent';
      if (receivedRequesterIds.has(userId)) return 'received';

      const fs = dto?.friendshipStatus?.toLowerCase();
      if (fs === 'friend' || fs === 'friends') return 'friend';
      if (fs === 'pending' || fs === 'sent') return 'sent';
      if (fs === 'received') return 'received';

      return 'none';
    },
    [user?.id, friendIds, sentTargetIds, receivedRequesterIds],
  );

  const searchByPhone = useCallback(
    async (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length < 9) return;

      // Normalize phone number to match database format (+840923232323)
      let normalizedPhone = cleaned;
      if (cleaned.startsWith('0')) {
        // Vietnamese number starting with 0: 0923232323 -> +840923232323
        normalizedPhone = '+84' + cleaned;
      } else if (cleaned.startsWith('84')) {
        // Already has country code without +: 840923232323 -> +840923232323
        normalizedPhone = '+' + cleaned;
      } else if (!cleaned.startsWith('+')) {
        // Assume Vietnamese number: 923232323 -> +84923232323
        normalizedPhone = '+84' + cleaned;
      }

      setIsSearching(true);
      setSearchError(null);
      setSearchResult(null);

      try {
        const response = await searchUsers(normalizedPhone);
        
        const users: SearchUserDTO[] = response?.data || [];

        if (users.length === 0) {
          setSearchError('Không tìm thấy người dùng với số điện thoại này');
          return;
        }

        const dto = users[0];
        const userId = dto.id || dto._id || '';
        const avatarRaw = dto.avatar;
        const avatarUrl =
          dto.avatarUrl ||
          (typeof avatarRaw === 'string' ? avatarRaw : avatarRaw?.url) ||
          undefined;

        const status = resolveStatus(userId, dto);
        

        setSearchResult({
          id: userId,
          fullName: dto.fullName || dto.name || 'Unknown',
          avatarUrl,
          phone: dto.phone,
          status,
        });
      } catch (err: any) {
        const msg = err?.message || 'Lỗi kết nối, vui lòng thử lại';
        setSearchError(msg);
      } finally {
        setIsSearching(false);
      }
    },
    [resolveStatus],
  );

  const sendRequest = useCallback(
    async (targetUserId: string) => {
      setIsSending(true);
      try {
        await sendRuntimeFriendRequest(targetUserId);
        // Don't auto-update status - let realtime events handle it
        // setSearchResult((prev) =>
        //   prev ? { ...prev, status: 'sent' } : prev,
        // );
      } catch (err: any) {
        const code = err?.code;
        if (code === 'ALREADY_EXISTS') {
          // Already exists - don't update status automatically
          // setSearchResult((prev) =>
          //   prev ? { ...prev, status: 'sent' } : prev,
          // );
        } else if (code === 'SELF_REQUEST') {
          Alert.alert('Lỗi', 'Không thể tự gửi lời mời kết bạn cho chính mình');
        } else {
          Alert.alert('Lỗi', err?.message || 'Gửi lời mời thất bại');
        }
      } finally {
        setIsSending(false);
      }
    },
    [],
  );

  const clearSearch = useCallback(() => {
    setSearchResult(null);
    setSearchError(null);
  }, []);

  return {
    isSearching,
    searchResult,
    searchError,
    isSending,
    searchByPhone,
    sendRequest,
    clearSearch,
  };
}
