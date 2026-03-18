import { getCurrentToken } from "./authService";
import api from "./http";

export const register = async (payload: any) => {
  try {
    console.log('👤 Registering user with payload:', payload);
    const response = await api.post("/api/auth/register", payload);
    console.log('✅ Registration successful');
    return response;
  } catch (e: any) {
    console.warn('authApi.register primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/auth/register',
      'http://175.41.136.189:5000/api/auth/register',
      'http://localhost:5000/api/auth/register'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying register fallback endpoint: ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        const resp = await fetch(endpoint, { 
          method: 'POST', 
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ Register fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`Register fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

// Note: login endpoint lives on the auth backend (not the BFF) — use absolute URL
export const login = async (payload: any) => {
  try {
    console.log('🔐 Logging in user with payload:', payload);
    const response = await api.post("http://54.179.206.215:5000/api/auth/login", payload);
    console.log('✅ Login successful');
    return response;
  } catch (e: any) {
    console.warn('authApi.login primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://175.41.136.189:5000/api/auth/login',
      'http://localhost:5000/api/auth/login'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying login fallback endpoint: ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        const resp = await fetch(endpoint, { 
          method: 'POST', 
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ Login fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`Login fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

export const logout = async () => {
  try {
    console.log('🚪 Logging out user');
    const response = await api.post("/api/auth/logout");
    console.log('✅ Logout successful');
    return response;
  } catch (e: any) {
    console.warn('authApi.logout primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/auth/logout',
      'http://175.41.136.189:5000/api/auth/logout',
      'http://localhost:5000/api/auth/logout'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        const token = await getCurrentToken();
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const resp = await fetch(endpoint, { 
          method: 'POST', 
          headers,
          signal: AbortSignal.timeout(8000)
        });
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ Logout fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`Logout fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

export const resetPassword = async (payload: any) => {
  try {
    console.log('🔑 Resetting password with payload:', payload);
    const response = await api.post("/api/auth/reset-password", payload);
    console.log('✅ Password reset successful');
    return response;
  } catch (e: any) {
    console.warn('authApi.resetPassword primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/auth/reset-password',
      'http://175.41.136.189:5000/api/auth/reset-password',
      'http://localhost:5000/api/auth/reset-password'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying reset password fallback endpoint: ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        const resp = await fetch(endpoint, { 
          method: 'POST', 
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ Reset password fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`Reset password fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

// QR login flow
export const qrGenerate = async (payload?: any) => {
  try {
    console.log('📱 Generating QR code with payload:', payload);
    const response = await api.post("/api/auth/qr/generate", payload || {});
    console.log('✅ QR generation successful');
    return response;
  } catch (e: any) {
    console.warn('authApi.qrGenerate primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/auth/qr/generate',
      'http://175.41.136.189:5000/api/auth/qr/generate',
      'http://localhost:5000/api/auth/qr/generate'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying QR generate fallback endpoint: ${endpoint}`);
        
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
          body: JSON.stringify(payload || {}),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ QR generate fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`QR generate fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

export const qrStatus = async (qrId: string) => {
  try {
    console.log('🔍 Checking QR status for ID:', qrId);
    const response = await api.get(`/api/auth/qr/status/${qrId}`);
    console.log('✅ QR status check successful');
    return response;
  } catch (e: any) {
    console.warn('authApi.qrStatus primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/auth/qr/status',
      'http://175.41.136.189:5000/api/auth/qr/status',
      'http://localhost:5000/api/auth/qr/status'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        const fallbackUrl = `${endpoint}/${qrId}`;
        console.log(`🔄 Trying QR status fallback endpoint: ${fallbackUrl}`);
        
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
          console.log(`✅ QR status fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`QR status fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

export const qrConfirm = async (qrId: string, payload?: any) => {
  try {
    console.log('✅ Confirming QR for ID:', qrId, 'payload:', payload);
    const response = await api.post(`/api/auth/qr/confirm/${qrId}`, payload || {});
    console.log('✅ QR confirmation successful');
    return response;
  } catch (e: any) {
    console.warn('authApi.qrConfirm primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/auth/qr/confirm',
      'http://175.41.136.189:5000/api/auth/qr/confirm',
      'http://localhost:5000/api/auth/qr/confirm'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        const fallbackUrl = `${endpoint}/${qrId}`;
        console.log(`🔄 Trying QR confirm fallback endpoint: ${fallbackUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const token = await getCurrentToken();
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const resp = await fetch(fallbackUrl, { 
          method: 'POST', 
          headers,
          body: JSON.stringify(payload || {}),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ QR confirm fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`QR confirm fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

export const qrReject = async (qrId: string, payload?: any) => {
  try {
    console.log('❌ Rejecting QR for ID:', qrId, 'payload:', payload);
    const response = await api.post(`/api/auth/qr/reject/${qrId}`, payload || {});
    console.log('✅ QR rejection successful');
    return response;
  } catch (e: any) {
    console.warn('authApi.qrReject primary request failed, attempting fallback:', e.message);
    
    const fallbackEndpoints = [
      'http://54.179.206.215:5000/api/auth/qr/reject',
      'http://175.41.136.189:5000/api/auth/qr/reject',
      'http://localhost:5000/api/auth/qr/reject'
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        const fallbackUrl = `${endpoint}/${qrId}`;
        console.log(`🔄 Trying QR reject fallback endpoint: ${fallbackUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const token = await getCurrentToken();
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const resp = await fetch(fallbackUrl, { 
          method: 'POST', 
          headers,
          body: JSON.stringify(payload || {}),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const json = await resp.json();
          console.log(`✅ QR reject fallback successful: ${endpoint}`);
          return { data: json, status: resp.status };
        }
      } catch (fallbackErr: any) {
        console.warn(`QR reject fallback error for ${endpoint}:`, fallbackErr.message);
        continue;
      }
    }
    
    throw e;
  }
};

export default {
  register,
  login,
  logout,
  resetPassword,
  qrGenerate,
  qrStatus,
  qrConfirm,
  qrReject,
};
