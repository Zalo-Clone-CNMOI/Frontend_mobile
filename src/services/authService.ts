import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys cho AsyncStorage
const AUTH_KEYS = {
  ACCESS_TOKEN: '@access_token',
  REFRESH_TOKEN: '@refresh_token',
  USER_INFO: '@user_info',
  PHONE_NUMBER: '@phone_number',
  IS_LOGGED_IN: '@is_logged_in'
};

// Interface cho user info
export interface UserInfo {
  phone: string;
  password?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
  id?: string;
  status?: string;
  createdAt?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  loginTime?: number;
}

// Lưu thông tin đăng nhập
export const saveAuthData = async (userInfo: UserInfo) => {
  try {
    await AsyncStorage.multiSet([
      [AUTH_KEYS.ACCESS_TOKEN, userInfo.tokens?.accessToken || ''],
      [AUTH_KEYS.REFRESH_TOKEN, userInfo.tokens?.refreshToken || ''],
      [AUTH_KEYS.USER_INFO, JSON.stringify(userInfo)],
      [AUTH_KEYS.PHONE_NUMBER, userInfo.phone],
      [AUTH_KEYS.IS_LOGGED_IN, 'true']
    ]);
    console.log('Auth data saved successfully');
    console.log(userInfo);
  } catch (error) {
    console.error('Error saving auth data:', error);
  }
};

// Lấy thông tin đăng nhập
export const getAuthData = async (): Promise<UserInfo | null> => {
  try {
    const results = await AsyncStorage.multiGet([
      AUTH_KEYS.ACCESS_TOKEN,
      AUTH_KEYS.REFRESH_TOKEN,
      AUTH_KEYS.USER_INFO,
      AUTH_KEYS.PHONE_NUMBER,
      AUTH_KEYS.IS_LOGGED_IN
    ]);

    const accessToken = results[0]?.[1] || null;
    const refreshToken = results[1]?.[1] || null;
    const userInfoStr = results[2]?.[1] || null;
    const phoneNumber = results[3]?.[1] || null;
    const isLoggedIn = results[4]?.[1] || null;
    
    if (isLoggedIn === 'true' && userInfoStr && phoneNumber) {
      const userInfo = JSON.parse(userInfoStr);
      return {
        ...userInfo,
        tokens: {
          accessToken: accessToken || userInfo.tokens?.accessToken || '',
          refreshToken: refreshToken || userInfo.tokens?.refreshToken || '',
          expiresIn: userInfo.tokens?.expiresIn || 0,
        },
        phone: phoneNumber
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting auth data:', error);
    return null;
  }
};

// Xóa thông tin đăng nhập (logout)
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([
      AUTH_KEYS.ACCESS_TOKEN,
      AUTH_KEYS.REFRESH_TOKEN,
      AUTH_KEYS.USER_INFO,
      AUTH_KEYS.PHONE_NUMBER,
      AUTH_KEYS.IS_LOGGED_IN
    ]);
    console.log('Auth data cleared successfully');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

// Kiểm tra xem đã đăng nhập chưa
export const isLoggedIn = async (): Promise<boolean> => {
  try {
    const isLoggedIn = await AsyncStorage.getItem(AUTH_KEYS.IS_LOGGED_IN);
    return isLoggedIn === 'true';
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
};

// Lấy token hiện tại
export const getCurrentToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Lấy refresh token hiện tại
export const getCurrentRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
};

// Refresh access token
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await getCurrentRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('http://175.41.136.189:5000/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to refresh token');
    }

    // Save new tokens
    const currentAuthData = await getAuthData();
    if (currentAuthData) {
      const updatedAuthData = {
        ...currentAuthData,
        tokens: {
          accessToken: data.tokens?.accessToken || data.accessToken || '',
          refreshToken: data.tokens?.refreshToken || data.refreshToken || refreshToken,
          expiresIn: data.tokens?.expiresIn || data.expiresIn || 0,
        }
      };
      await saveAuthData(updatedAuthData);
      console.log('Token refreshed successfully');
      return updatedAuthData.tokens?.accessToken || null;
    }

    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    // If refresh fails, clear auth data and force login
    await clearAuthData();
    return null;
  }
};

// Lấy thông tin user hiện tại
export const getCurrentUser = async (): Promise<UserInfo | null> => {
  try {
    const userInfoStr = await AsyncStorage.getItem(AUTH_KEYS.USER_INFO);
    return userInfoStr ? JSON.parse(userInfoStr) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// API wrapper with auto-refresh token
export const apiCallWithRefresh = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    // Get current access token
    let accessToken = await getCurrentToken();
    
    // If no access token, try to refresh
    if (!accessToken) {
      accessToken = await refreshAccessToken();
      if (!accessToken) {
        throw new Error('No valid token available');
      }
    }

    // Make initial API call
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // If token expired (401), try refresh once
    if (response.status === 401) {
      console.log('Token expired, refreshing...');
      const newAccessToken = await refreshAccessToken();
      
      if (!newAccessToken) {
        throw new Error('Failed to refresh token');
      }

      // Retry with new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newAccessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }

    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};
