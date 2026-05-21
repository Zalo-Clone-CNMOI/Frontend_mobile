import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authApi from '../services/authApi';
import { NETWORK_CONFIG } from '../config/network';
import { clearAuthData, getAuthData, saveAuthData, UserInfo } from '../services/authService';
import { resetChatRuntime } from '../services/chatService';
import { resetRealtimeClients } from '../services/realtime/defaultRealtimeClients';
import { resetRuntimeFriendService } from '../services/realtime/runtimeFriendService';
import { disconnectSocket } from '../services/socket';
import * as usersApi from '../services/usersApi';
import { useChatsStore } from '../store/useChatsStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { useRealtimeStore } from '../store/useRealtimeStore';

const normalizeAvatar = (avatar?: string): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    // Replace bucket name if URL from backend uses wrong bucket
    return avatar.replace(/https?:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com/, NETWORK_CONFIG.S3_BASE_URL);
  }
  return NETWORK_CONFIG.S3_BASE_URL + '/' + avatar.replace(/^\//, '');
};

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  isLoggingOut: boolean;
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const resetChatsStore = useChatsStore((state) => state.reset);
  const resetMessagesStore = useMessagesStore((state) => state.reset);
  const resetRealtimeStore = useRealtimeStore((state) => state.reset);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        
        // Check if logout is in progress - prevent auto-login
        const logoutInProgress = await AsyncStorage.getItem('@auth_logout_in_progress');
        if (logoutInProgress === 'true') {
          // Clear the flag and ensure clean state
          await AsyncStorage.removeItem('@auth_logout_in_progress');
          await clearAuthData();
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        const authData = await getAuthData();
        if (authData) {
          setUser(authData);
          try {
            const resp = await usersApi.getProfile();
            const serverData = resp?.data?.data || resp?.data || null;
            if (serverData) {
              const merged: UserInfo = {
                ...authData,
                name: serverData.fullName || serverData.name,
                email: serverData.email,
                avatarUrl: normalizeAvatar(serverData.avatarUrl || serverData.avatar) || undefined,
                bio: serverData.bio,
                dateOfBirth: serverData.dateOfBirth,
                gender: serverData.gender,
                id: serverData.id,
                status: serverData.status,
                createdAt: serverData.createdAt,
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
      // Normalize avatarUrl to ensure it has S3 base URL
      const normalizedUserInfo = {
        ...userInfo,
        avatarUrl: normalizeAvatar(userInfo.avatarUrl) || undefined,
      };
      await saveAuthData(normalizedUserInfo);
      setUser(normalizedUserInfo);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    // Prevent concurrent logout
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    let logoutSuccess = false;
    let errorMessage = '';

    try {
      // STEP 1: Immediately clear user state to prevent auto-redirect/re-login
      // This must happen FIRST to ensure UI shows logged-out state immediately
      setUser(null);
      
      // Set a flag to prevent any background processes from re-logging in
      await AsyncStorage.setItem('@auth_logout_in_progress', 'true');

      // STEP 2: Logout API while access token is still in memory
      let deviceId: string | undefined;
      try {
        deviceId = await AsyncStorage.getItem('@device_id') || undefined;
      } catch (e) {
      }

      try {
        await authApi.logout(deviceId);
        logoutSuccess = true;
      } catch (apiError: any) {
        const status = apiError?.response?.status;
        if (status === 401 || status === 403) {
          logoutSuccess = true;
        } else {
          errorMessage = apiError?.message || 'Logout request failed';
        }
      }

      try {
        await authApi.deleteAllDeviceTokens();
      } catch (deleteError: any) {
        const status = deleteError?.response?.status;
        if (status !== 404 && status !== 401) {
          console.warn('[Auth] deleteAllDeviceTokens failed:', deleteError?.message);
        }
      }

      // STEP 3: Stop sockets/realtime before wiping tokens
      await resetRuntimeState();

      // STEP 4: Clear persisted auth
      try {
        await clearAuthData();
      } catch (storageError) {
        errorMessage = errorMessage || 'Failed to clear local data';
      }

      // Clear device token from AsyncStorage
      try {
        const { clearDeviceToken } = await import('../services/deviceTokenService');
        await clearDeviceToken();
      } catch (deviceTokenError) {
      }

      // STEP 5: Clear the logout flag
      await AsyncStorage.removeItem('@auth_logout_in_progress');

      // Show feedback based on result
      if (!logoutSuccess) {
      }
    } catch (error: any) {
      errorMessage = error?.message || 'Logout failed';
      // Ensure user is cleared even on error
      setUser(null);
      throw error;
    } finally {
      setIsLoggingOut(false);
    }
  };

  const updateUser = async (updates: Partial<UserInfo>) => {
    try {
      if (!user) return;
      // Normalize avatarUrl if it's being updated
      const normalizedUpdates = {
        ...updates,
        avatarUrl: updates.avatarUrl ? normalizeAvatar(updates.avatarUrl) || undefined : user.avatarUrl,
      };
      const updatedUser = { ...user, ...normalizedUpdates };
      await saveAuthData(updatedUser);
      setUser(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isLoggingOut,
    login,
    logout,
    isAuthenticated: !!user,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
