import { getCurrentToken } from "./authService";
import api from "./http";

// Cursor-based message listing
export const getMessages = async (
  conversationId: string,
  limit = 50,
  cursor?: string,
) => {
  try {
    console.log('📨 Fetching messages for conversation:', conversationId);
    const response = await api.get(`/api/messages/${encodeURIComponent(conversationId)}`, {
      params: { limit, cursor },
    });
    console.log('✅ Messages API successful');
    return response;
  } catch (e: any) {
    console.warn('messagesApi.getMessages primary request failed, attempting fallback:', e.message);
    
    // Try fallback endpoints
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/messages',
      'http://175.41.136.189:5000/api/messages',
      'http://localhost:5000/api/messages'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying messages fallback endpoint: ${endpoint}`);
        
        const searchParams = new URLSearchParams({
          limit: limit.toString(),
          ...(cursor && { cursor })
        });
        
        const fallbackUrl = `${endpoint}/${encodeURIComponent(conversationId)}?${searchParams}`;
        
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
        
        console.log(`📡 Messages fallback response status: ${resp.status}`);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ Messages fallback successful: ${endpoint}`);
          // Convert to axios-like format
          return { data: json, status: resp.status };
        } else {
          const text = await resp.text().catch(() => '');
          console.warn(`Messages fallback failed (${resp.status}): ${text}`);
        }
      } catch (fallbackErr: any) {
        console.warn(`Messages fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    console.warn('All messages endpoints failed');
    throw e;
  }
};

// Fetch single message full details (including attachments) by conversation/createdAt/messageId
export const getMessageDetails = async (
  conversationId: string,
  createdAt: string | number,
  messageId: string,
) => {
  try {
    const response = await api.get(
      `/api/messages/${encodeURIComponent(conversationId)}/${createdAt}/${encodeURIComponent(messageId)}`,
    );
    return response;
  } catch (e: any) {
    console.warn('messagesApi.getMessageDetails primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/messages',
      'http://175.41.136.189:5000/api/messages',
      'http://localhost:5000/api/messages'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        const fallbackUrl = `${endpoint}/${encodeURIComponent(conversationId)}/${createdAt}/${encodeURIComponent(messageId)}`;
        
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
          console.log(`✅ Message details fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`Message details fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

// Upload media file(s). Expects FormData with file fields (React Native FormData)
export const uploadMedia = async (formData: FormData) => {
  try {
    const response = await api.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response;
  } catch (e: any) {
    console.warn('messagesApi.uploadMedia primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/media/upload',
      'http://175.41.136.189:5000/media/upload',
      'http://localhost:5000/media/upload'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Longer timeout for uploads
        
        const token = await getCurrentToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        // Don't set Content-Type for FormData - browser will set it with boundary

        const resp = await fetch(endpoint, { 
          method: 'POST', 
          headers,
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ Media upload fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`Media upload fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

export default {
  getMessages,
  getMessageDetails,
  uploadMedia,
};
