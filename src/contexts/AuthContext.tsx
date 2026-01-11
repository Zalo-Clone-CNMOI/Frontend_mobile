import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { clearAuthData, getAuthData, UserInfo } from '../services/authService';

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

  // Kiểm tra phiên đăng nhập khi app khởi động
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        const authData = await getAuthData();
        if (authData) {
          setUser(authData);
          console.log('User already logged in:', authData.phone);
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
      setUser(userInfo);
      console.log('User logged in:', userInfo.phone);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
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
