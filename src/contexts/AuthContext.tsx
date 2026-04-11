import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import * as authApi from '../services/authApi';
import { clearAuthData, getAuthData, saveAuthData, UserInfo } from '../services/authService';
import { resetChatRuntime } from '../services/chatService';
import { resetRealtimeClients } from '../services/realtime/defaultRealtimeClients';
import { resetRuntimeFriendService } from '../services/realtime/runtimeFriendService';
import { disconnectSocket } from '../services/socket';
import * as usersApi from '../services/usersApi';
import { useChatsStore } from '../store/useChatsStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { useRealtimeStore } from '../store/useRealtimeStore';

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  login: (userInfo: UserInfo) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  updateUser: (updates: Partial<UserInfo>) => Promise<void>;
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
  const resetRealtimeStore = useRealtimeStore((state) => state.reset);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        const authData = await getAuthData();
        if (authData) {
          setUser(authData);
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
          }
        } else {
        }
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const resetRuntimeState = async () => {
    try {
      disconnectSocket();
    } catch {}
    await resetRealtimeClients();
    resetRuntimeFriendService();
    resetChatRuntime();
    resetChatsStore();
    resetMessagesStore();
    resetRealtimeStore();
  };

  const login = async (userInfo: UserInfo) => {
    try {
      await resetRuntimeState();
      await saveAuthData(userInfo);
      setUser(userInfo);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      try {
        await authApi.logout();
      } catch (e) {
      }

      await resetRuntimeState();
      await clearAuthData();
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  const updateUser = async (updates: Partial<UserInfo>) => {
    try {
      if (!user) return;
      const updatedUser = { ...user, ...updates };
      await saveAuthData(updatedUser);
      setUser(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
