import { apiCallWithRefresh } from './authService';
import { NETWORK_CONFIG } from '../config/network';
import { ApiResponseDTO, ApiListResponseDTO, ApiMetaDTO } from '../types/dto/ApiDTO';
import { getConversationDetail } from './conversationsApi';

const API_BASE_URL = NETWORK_CONFIG.API_BASE_URL;

// Make HTTP request with auth refresh
const request = async (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: unknown,
): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await apiCallWithRefresh(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed (${response.status})`);
  }

  // Return empty object for 204 No Content
  if (response.status === 204) {
    return {};
  }

  return response.json();
};

// Types matching Backend DTOs
export type GroupInviteStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export interface SendGroupInvitesRequest {
  userIds: string[];
  message?: string;
  expiresInHours?: number;
}

export interface SendGroupInvitesResponse {
  acceptedCount: number;
  skippedCount: number;
  inviteIds: string[];
}

export interface GroupInviteDTO {
  id: string;
  conversationId: string;
  inviterUserId: string;
  invitedUserId: string;
  status: GroupInviteStatus;
  message: string | null;
  expiresAt: string;
  createdAt: string;
  respondedAt: string | null;
  // Extended fields from API
  conversation?: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    memberCount: number;
  };
  inviter?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export interface GetPendingInvitesParams {
  page?: number;
  limit?: number;
  status?: GroupInviteStatus;
}

/**
 * Send group invites to users
 * POST /conversations/:conversationId/invites
 */
export const sendGroupInvites = async (
  conversationId: string,
  payload: SendGroupInvitesRequest
): Promise<ApiResponseDTO<SendGroupInvitesResponse>> => {
  // Validation
  if (!payload.userIds || !Array.isArray(payload.userIds)) {
    throw new Error('userIds must be an array');
  }
  if (payload.userIds.length === 0) {
    throw new Error('At least 1 user is required');
  }
  if (payload.userIds.length > 50) {
    throw new Error('Maximum 50 invites at once');
  }
  if (payload.message && payload.message.length > 500) {
    throw new Error('Message must not exceed 500 characters');
  }
  if (payload.expiresInHours !== undefined) {
    if (payload.expiresInHours < 1 || payload.expiresInHours > 168) {
      throw new Error('expiresInHours must be between 1 and 168 hours');
    }
  }

  return request('POST', `/conversations/${encodeURIComponent(conversationId)}/invites`, payload);
};

/**
 * Get pending invites for current user
 * GET /conversations/invites/pending
 * Note: User may not be member yet, so we skip enrich to avoid 403
 */
export const getPendingInvites = async (
  params?: GetPendingInvitesParams
): Promise<ApiResponseDTO<ApiListResponseDTO<GroupInviteDTO> & { meta?: ApiMetaDTO }>> => {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(50, Math.max(1, params?.limit || 20));
  const status = params?.status || 'pending';

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status,
  });

  const response = await request('GET', `/conversations/invites/pending?${queryParams.toString()}`);
  
  // Backend returns GroupInviteItemDto without nested objects
  // We skip enrich here because user may not be member yet (will get 403)
  // Frontend will use basic data from invite itself
  if (response.data?.items) {
    const invites = response.data.items;
    
    // Basic transform without fetching conversation details
    const enrichedInvites = invites.map((item: any) => ({
      ...item,
      conversation: {
        id: item.conversationId,
        name: null, // Will be filled from message metadata
        avatarUrl: null,
        memberCount: 0, // Will be filled from message metadata
      },
      inviter: {
        id: item.inviterUserId,
        fullName: null,
        avatarUrl: null,
      },
    }));
    
    response.data.items = enrichedInvites;
  }
  
  return response;
};

/**
 * Get invites for a specific conversation (owner/admin only)
 * GET /conversations/:conversationId/invites
 */
export const getConversationInvites = async (
  conversationId: string,
  params?: GetPendingInvitesParams
): Promise<ApiResponseDTO<ApiListResponseDTO<GroupInviteDTO> & { meta?: ApiMetaDTO }>> => {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(50, Math.max(1, params?.limit || 20));
  const status = params?.status || 'pending';

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status,
  });

  const response = await request('GET', `/conversations/${encodeURIComponent(conversationId)}/invites?${queryParams.toString()}`);
  
  // Backend returns GroupInviteItemDto without nested objects
  // Frontend expects GroupInviteDTO with conversation and inviter objects
  // We need to transform the response to match Frontend types
  if (response.data?.items) {
    const invites = response.data.items;
    
    // Fetch conversation details for each invite to get name and member count
    const enrichedInvites = await Promise.all(
      invites.map(async (item: any) => {
        try {
          const convResponse = await getConversationDetail(item.conversationId);
          const conversation = convResponse.data;
          
          return {
            ...item,
            conversation: {
              id: item.conversationId,
              name: conversation?.name || null,
              avatarUrl: conversation?.avatarUrl || null,
              memberCount: conversation?.members?.length || 0,
            },
            inviter: {
              id: item.inviterUserId,
              fullName: conversation?.members?.find((m: any) => m.userId === item.inviterUserId)?.fullName || null,
              avatarUrl: conversation?.members?.find((m: any) => m.userId === item.inviterUserId)?.avatarUrl || null,
            },
          };
        } catch (error) {
          // Fallback if conversation fetch fails
          return {
            ...item,
            conversation: {
              id: item.conversationId,
              name: null,
              avatarUrl: null,
              memberCount: 0,
            },
            inviter: {
              id: item.inviterUserId,
              fullName: null,
              avatarUrl: null,
            },
          };
        }
      })
    );
    
    response.data.items = enrichedInvites;
  }
  
  return response;
};

/**
 * Accept a group invite
 * POST /conversations/:conversationId/invites/:inviteId/accept
 */
export const acceptGroupInvite = async (
  conversationId: string,
  inviteId: string
): Promise<ApiResponseDTO<{ message: string }>> => {
  return request('POST', `/conversations/${encodeURIComponent(conversationId)}/invites/${encodeURIComponent(inviteId)}/accept`);
};

/**
 * Reject a group invite
 * POST /conversations/:conversationId/invites/:inviteId/reject
 */
export const rejectGroupInvite = async (
  conversationId: string,
  inviteId: string
): Promise<ApiResponseDTO<{ message: string }>> => {
  return request('POST', `/conversations/${encodeURIComponent(conversationId)}/invites/${encodeURIComponent(inviteId)}/reject`);
};

/**
 * Cancel a group invite
 * POST /conversations/:conversationId/invites/:inviteId/cancel
 */
export const cancelGroupInvite = async (
  conversationId: string,
  inviteId: string
): Promise<ApiResponseDTO<{ message: string }>> => {
  return request('POST', `/conversations/${encodeURIComponent(conversationId)}/invites/${encodeURIComponent(inviteId)}/cancel`);
};
