import { getCurrentToken } from './authService';
import api from "./http";

export const getConversations = async (params?: any) => {
  try {
    console.log('📋 Fetching conversations with params:', params);
    const response = await api.get("/api/conversations", { params });
    console.log('✅ Conversations API successful');
    return response;
  } catch (e: any) {
    console.warn('conversationsApi.getConversations primary request failed, attempting fallback:', e.message);
    
    // Try fallback endpoints
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/conversations',
      'http://175.41.136.189:5000/api/conversations',
      'http://localhost:5000/api/conversations'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying conversations fallback endpoint: ${endpoint}`);
        
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
        
        console.log(`📡 Conversations fallback response status: ${resp.status}`);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ Conversations fallback successful: ${endpoint}`);
          // Convert to axios-like format
          return { data: json, status: resp.status };
        } else {
          const text = await resp.text().catch(() => '');
          console.warn(`Conversations fallback failed (${resp.status}): ${text}`);
        }
      } catch (fallbackErr: any) {
        console.warn(`Conversations fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    console.warn('All conversations endpoints failed');
    throw e;
  }
};

export const createGroup = async (payload: any) => {
  try {
    console.log('👥 Creating group with payload:', payload);
    const response = await api.post("/api/conversations/group", payload);
    console.log('✅ Group created successfully');
    return response;
  } catch (e: any) {
    console.warn('conversationsApi.createGroup primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/conversations/group',
      'http://175.41.136.189:5000/api/conversations/group',
      'http://localhost:5000/api/conversations/group'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying group creation fallback endpoint: ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const token = await getCurrentToken();
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const resp = await fetch(endpoint, { 
          method: 'POST', 
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ Group creation fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`Group creation fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

export const createDirect = async (participantId: string) => {
  try {
    console.log('🔄 Creating direct conversation with participant:', participantId);
    const response = await api.post("/api/conversations/direct", { participantId });
    console.log('✅ Direct conversation created successfully');
    return response;
  } catch (e: any) {
    console.warn('conversationsApi.createDirect primary request failed, attempting fallback:', e.message);
    
    // Try fallback endpoints
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/conversations/direct',
      'http://175.41.136.189:5000/api/conversations/direct',
      'http://localhost:5000/api/conversations/direct'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying conversation fallback endpoint: ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const token = await getCurrentToken();
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const resp = await fetch(endpoint, { 
          method: 'POST', 
          headers,
          body: JSON.stringify({ participantId }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`📡 Conversation fallback response status: ${resp.status}`);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ Conversation fallback successful: ${endpoint}`);
          // Convert to axios-like format
          return { data: json, status: resp.status };
        } else {
          const text = await resp.text().catch(() => '');
          console.warn(`Conversation fallback failed (${resp.status}): ${text}`);
        }
      } catch (fallbackErr: any) {
        console.warn(`Conversation fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

export const addMember = (conversationId: string, payload: any) =>
  api.post(`/api/conversations/${conversationId}/members`, payload);
export const updateMember = (
  conversationId: string,
  memberId: string,
  payload: any,
) =>
  api.patch(
    `/api/conversations/${conversationId}/members/${memberId}`,
    payload,
  );
export const removeMember = (conversationId: string, memberId: string) =>
  api.delete(`/api/conversations/${conversationId}/members/${memberId}`);

export const leaveConversation = (conversationId: string) =>
  api.post(`/api/conversations/${conversationId}/leave`);
export const markAsRead = (conversationId: string, payload?: any) =>
  api.post(`/api/conversations/${conversationId}/read`, payload || {});

export default {
  getConversations,
  createGroup,
  createDirect,
  addMember,
  updateMember,
  removeMember,
  leaveConversation,
  markAsRead,
};
