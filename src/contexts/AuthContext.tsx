import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { clearAuthData, getAuthData, saveAuthData, UserInfo } from '../services/authService';
import * as authApi from '../services/authApi';
import { resetChatRuntime } from '../services/chatService';
import { disconnectSocket } from '../services/socket';
import { useChatsStore } from '../store/useChatsStore';
import { useMessagesStore } from '../store/useMessagesStore';
import * as usersApi from '../services/usersApi';

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  login: (userInfo: UserInfo) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const resetChatsStore = useChatsStore((state) => state.reset);
  const resetMessagesStore = useMessagesStore((state) => state.reset);

  // Kiểm tra phiên đăng nhập khi app khởi động
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        const authData = await getAuthData();
        if (authData) {
          setUser(authData);
          console.log('User already logged in:', authData.phone);
          // Attempt to refresh user profile from server to populate latest fields
          try {
            const resp = await usersApi.getProfile();
            const serverData = resp?.data?.data || resp?.data || null;
            if (serverData) {
              const merged: UserInfo = {
                ...authData,
                name: serverData.fullName || serverData.name || authData.name,
                email: serverData.email || authData.email,
                avatarUrl: serverData.avatarUrl || serverData.avatar || authData.avatarUrl,
                bio: serverData.bio || authData.bio,
                dateOfBirth: serverData.dateOfBirth || authData.dateOfBirth,
                gender: serverData.gender || authData.gender,
                id: serverData.id || authData.id,
                status: serverData.status || authData.status,
                createdAt: serverData.createdAt || authData.createdAt,
                tokens: authData.tokens,
                phone: authData.phone,
                loginTime: authData.loginTime,
              };
              await saveAuthData(merged);
              setUser(merged);
            }
          } catch (e) {
            console.warn('Failed to refresh profile from server', e);
          }
        } else {
          console.log('No active session found');
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (userInfo: UserInfo) => {
    try {
      // Ensure no cross-account residue before starting a new session
      try {
        disconnectSocket();
      } catch {}
      resetChatRuntime();
      resetChatsStore();
      resetMessagesStore();

      await saveAuthData(userInfo);
      setUser(userInfo);
      console.log('User logged in:', userInfo.phone);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Attempt to notify backend to invalidate refresh token / logout session
      try {
        // If device token was stored, backend may expect it in body to unregister push token
        // We don't have deviceId stored centrally; call /logout without body as best-effort
        await authApi.logout({});
      } catch (e) {
        console.warn('authApi.logout failed (continuing):', e);
      }

      // Try to delete device token on server if any (best-effort)
      try {
        // If you store a device token id in AsyncStorage, fetch and call delete here.
        // Example: await deviceTokensApi.deleteDeviceToken(deviceId);
      } catch (e) {
        console.warn('device token unregister failed (continuing):', e);
      }

      // Disconnect realtime socket
      try {
        disconnectSocket();
      } catch (e) {
        console.warn('disconnectSocket failed (continuing):', e);
      }

      resetChatRuntime();
      resetChatsStore();
      resetMessagesStore();

      await clearAuthData();
      setUser(null);
      console.log('User logged out');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
