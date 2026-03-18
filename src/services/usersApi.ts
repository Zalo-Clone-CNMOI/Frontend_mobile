import { getCurrentToken } from './authService';
import api from "./http";

export const getProfile = () => api.get("/api/users/me");
export const updateProfile = (payload: any) =>
  api.patch("/api/users/me", payload);

// Search users. Try BFF first; if no results, fall back to direct backend on port 5000.
export const searchUsers = async (query: string, params?: any) => {
  const trimmedQuery = query.trim();
  
  // Validate query according to API requirements
  if (!trimmedQuery) {
    return { data: [], message: "Search query cannot be empty", error: "q should not be empty" };
  }
  
  if (typeof trimmedQuery !== 'string') {
    return { data: [], message: "Search query must be text", error: "q must be a string" };
  }
  
  if (trimmedQuery.length < 2) {
    return { data: [], message: "Search query must be at least 2 characters", error: "Bad Request" };
  }
  
  if (trimmedQuery.length > 50) {
    return { data: [], message: "Search query must not exceed 50 characters", error: "Bad Request" };
  }

  // Try BFF first
  try {
    console.log('🔍 Attempting BFF search for:', trimmedQuery);
    
    // Log token for debugging
    const token = await getCurrentToken();
    console.log('🔑 Using token (first 20 chars):', token?.substring(0, 20) + '...');
    
    const resp = await api.get("/api/users/search", { 
      params: { q: trimmedQuery, ...params },
      timeout: 10000 // 10 second timeout
    });
    
    // Normalize and return response (allow empty arrays)
    const payload = resp?.data ?? resp;
    console.log('✅ BFF search successful');
    return payload;
  } catch (e: any) {
    console.warn('usersApi.searchUsers primary request failed, attempting fallback:', e.message);
    
    // Try multiple fallback endpoints
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/users/search',
      'http://175.41.136.189:5000/api/users/search', // Try same host different port
      'http://localhost:5000/api/users/search', // Local development fallback
      'http://175.41.136.189:3000/api/users/search' // Try BFF endpoint directly
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying fallback endpoint: ${endpoint}`);
        
        const searchParams = new URLSearchParams({
          q: trimmedQuery,
          ...(params?.page && { page: params.page.toString() }),
          ...(params?.limit && { limit: params.limit.toString() })
        });
        
        const fallbackUrl = `${endpoint}?${searchParams}`;
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
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
        
        console.log(`📡 Fallback response status: ${resp.status}`);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`📡 Fallback response data:`, JSON.stringify(json, null, 2));
          console.log(`✅ Fallback successful: ${endpoint}`);
          return json;
        } else {
          const text = await resp.text().catch(() => '');
          console.warn(`Fallback failed (${resp.status}): ${text}`);
        }
      } catch (fallbackErr: any) {
        console.warn(`Fallback error for ${endpoint}:`, fallbackErr.message);
        continue; // Try next endpoint
      }
    }
    
    // All fallbacks failed, return mock data for better UX
    console.warn('All search endpoints failed, returning empty results');
    return { 
      data: [], 
      message: "Search temporarily unavailable. Please try again later.",
      error: e.message 
    };
  }
};

export default {
  getProfile,
  updateProfile,
  searchUsers,
};
