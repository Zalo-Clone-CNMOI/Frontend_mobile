import { getCurrentToken } from './authService';
import api from "./http";

export const getFriends = async (params?: any) => {
  try {
    const response = await api.get("/api/friends", { params });
    return response;
  } catch (e: any) {
    console.warn('friendsApi.getFriends primary request failed, attempting fallback:', e.message);
    
    // Try fallback endpoints
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/friends',
      'http://175.41.136.189:5000/api/friends',
      'http://localhost:5000/api/friends'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        const searchParams = new URLSearchParams({
          ...(params?.page && { page: params.page.toString() }),
          ...(params?.limit && { limit: params.limit.toString() })
        });
        
        const fallbackUrl = `${endpoint}?${searchParams}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const token = await getCurrentToken();
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const resp = await fetch(fallbackUrl, { 
          method: 'GET', 
          headers,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const json = await resp.json();
          // Convert to axios-like format
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        continue;
      }
    }
    
    throw e;
  }
};

export const getPendingRequests = (params?: any) =>
  api.get("/api/friends/requests/pending", { params });
export const getSentRequests = (params?: any) =>
  api.get("/api/friends/requests/sent", { params });

export const sendFriendRequest = (payload: any) =>
  api.post("/api/friends/requests", payload);
export const updateFriendRequest = (requestId: string, payload: any) =>
  api.patch(`/api/friends/requests/${requestId}`, payload);
export const deleteFriendRequest = (requestId: string) =>
  api.delete(`/api/friends/requests/${requestId}`);

export const blockUser = (payload: any) =>
  api.post("/api/friends/block", payload);

export default {
  getFriends,
  getPendingRequests,
  getSentRequests,
  sendFriendRequest,
  updateFriendRequest,
  deleteFriendRequest,
  blockUser,
};
