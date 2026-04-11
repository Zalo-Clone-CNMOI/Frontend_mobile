/**
 * Utility functions for data transformation and normalization
 */

export type FriendDTO = {
  id?: string;
  _id?: string;
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  bio?: string;
  status?: string;
  isOnline?: boolean;
  lastSeenAt?: string;
  lastSeen?: string | number;
  friendsSince?: string;
  mutualFriends?: number;
  friendType?: string;
  friendStatus?: string;
  friendCategory?: string;
  friendRequestStatus?: string;
  friendRequestSent?: boolean;
  friendRequestReceived?: boolean;
  friendRequestMessage?: string;
};

export class DataTransformer {
  /**
   * Normalize ID from various formats
   */
  static normalizeId(value: unknown): string {
    return String(value ?? "").trim();
  }

  /**
   * Convert various timestamp formats to milliseconds
   */
  static toTimestampMs(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    
    if (typeof value === "string" && value.trim().length > 0) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
      
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    
    return Date.now();
  }

  /**
   * Extract user ID from various user object formats
   */
  static extractUserId(user: any): string {
    return this.normalizeId(
      user?.id ??
      user?.userId ??
      user?._id ??
      user?.uid ??
      user?.sub
    );
  }

  /**
   * Create stable message ID from API response
   */
  static buildStableMessageId(apiMessage: any): string {
    const directId = this.normalizeId(
      apiMessage?.messageId ?? apiMessage?.message_id ?? apiMessage?.id,
    );
    
    if (directId) return directId;

    const conversationId = this.normalizeId(
      apiMessage?.conversationId ?? apiMessage?.conversation_id,
    );
    
    const senderId = this.normalizeId(
      apiMessage?.senderId ??
      apiMessage?.sender_id ??
      apiMessage?.sender?.id ??
      apiMessage?.sender?.userId ??
      apiMessage?.user_id ??
      apiMessage?.author_id,
    );
    
    const createdAt = this.normalizeId(
      apiMessage?.createdAt ??
      apiMessage?.created_at ??
      apiMessage?.sent_at ??
      apiMessage?.timestamp,
    );
    
    const body = this.normalizeId(apiMessage?.body ?? apiMessage?.text ?? apiMessage?.content);
    const attachmentKey = this.normalizeId(
      Array.isArray(apiMessage?.attachments) ? apiMessage?.attachments?.[0]?.key : "",
    );

    const composite = [conversationId, senderId, createdAt, body, attachmentKey]
      .filter(Boolean)
      .join("|");

    if (composite) return `msg_${composite}`;
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Transform API friend data to consistent format
   */
  static normalizeFriend(apiFriend: FriendDTO): any {
    return {
      id: this.normalizeId(apiFriend.id ?? apiFriend._id),
      fullName: apiFriend.fullName ?? apiFriend.name ?? `${apiFriend.firstName ?? ''} ${apiFriend.lastName ?? ''}`.trim(),
      avatarUrl: apiFriend.avatarUrl ?? apiFriend.avatar ?? null,
      phone: apiFriend.phone ?? null,
      email: apiFriend.email ?? null,
      bio: apiFriend.bio ?? null,
      status: apiFriend.status ?? null,
      isOnline: apiFriend.isOnline ?? false,
      lastSeenAt: apiFriend.lastSeenAt ?? apiFriend.lastSeen ?? null,
      friendsSince: apiFriend.friendsSince ?? null,
      mutualFriends: apiFriend.mutualFriends ?? 0,
    };
  }

  /**
   * Check if two user IDs are the same (handles various formats)
   */
  static isSameUser(id1: unknown, id2: unknown): boolean {
    const normalized1 = this.normalizeId(id1);
    const normalized2 = this.normalizeId(id2);
    return normalized1.length > 0 && normalized1 === normalized2;
  }

  /**
   * Create a safe key for object storage
   */
  static createSafeKey(...parts: (string | number | undefined)[]): string {
    return parts
      .filter(Boolean)
      .map(part => String(part).replace(/[^a-zA-Z0-9]/g, '_'))
      .join('_');
  }
}
