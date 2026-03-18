import { getCurrentToken } from "./authService";
import api from "./http";

export const registerDeviceToken = async (payload: any) => {
  try {
    console.log('📱 Registering device token with payload:', payload);
    const response = await api.post("/api/device-tokens", payload);
    console.log('✅ Device token registration successful');
    return response;
  } catch (e: any) {
    console.warn('deviceTokensApi.registerDeviceToken primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/device-tokens',
      'http://175.41.136.189:5000/api/device-tokens',
      'http://localhost:5000/api/device-tokens'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying device token register fallback endpoint: ${endpoint}`);
        
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
          console.log(`✅ Device token register fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`Device token register fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

export const deleteDeviceToken = async (tokenId: string) => {
  try {
    console.log('🗑️ Deleting device token:', tokenId);
    const response = await api.delete(`/api/device-tokens/${encodeURIComponent(tokenId)}`);
    console.log('✅ Device token deletion successful');
    return response;
  } catch (e: any) {
    console.warn('deviceTokensApi.deleteDeviceToken primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/device-tokens',
      'http://175.41.136.189:5000/api/device-tokens',
      'http://localhost:5000/api/device-tokens'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        const fallbackUrl = `${endpoint}/${encodeURIComponent(tokenId)}`;
        console.log(`🔄 Trying device token delete fallback endpoint: ${fallbackUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const token = await getCurrentToken();
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const resp = await fetch(fallbackUrl, { 
          method: 'DELETE', 
          headers,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ Device token delete fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`Device token delete fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

export default {
  registerDeviceToken,
  deleteDeviceToken,
};
