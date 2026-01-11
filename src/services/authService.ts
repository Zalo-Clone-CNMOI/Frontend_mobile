import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys cho AsyncStorage
const AUTH_KEYS = {
  USER_TOKEN: '@user_token',
  USER_INFO: '@user_info',
  PHONE_NUMBER: '@phone_number',
  IS_LOGGED_IN: '@is_logged_in'
};

// Interface cho user info
export interface UserInfo {
  phone: string;
  name?: string;
  avatar?: string;
  token?: string;
  loginTime?: number;
}

// Lưu thông tin đăng nhập
export const saveAuthData = async (userInfo: UserInfo) => {
  try {
    await AsyncStorage.multiSet([
      [AUTH_KEYS.USER_TOKEN, userInfo.token || ''],
      [AUTH_KEYS.USER_INFO, JSON.stringify(userInfo)],
      [AUTH_KEYS.PHONE_NUMBER, userInfo.phone],
      [AUTH_KEYS.IS_LOGGED_IN, 'true']
    ]);
    console.log('Auth data saved successfully');
  } catch (error) {
    console.error('Error saving auth data:', error);
  }
};

// Lấy thông tin đăng nhập
export const getAuthData = async (): Promise<UserInfo | null> => {
  try {
    const results = await AsyncStorage.multiGet([
      AUTH_KEYS.USER_TOKEN,
      AUTH_KEYS.USER_INFO,
      AUTH_KEYS.PHONE_NUMBER,
      AUTH_KEYS.IS_LOGGED_IN
    ]);

    const token = results[0]?.[1] || null;
    const userInfoStr = results[1]?.[1] || null;
    const phoneNumber = results[2]?.[1] || null;
    const isLoggedIn = results[3]?.[1] || null;
    
    if (isLoggedIn === 'true' && userInfoStr && phoneNumber) {
      const userInfo = JSON.parse(userInfoStr);
      return {
        ...userInfo,
        token: token || userInfo.token,
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
      AUTH_KEYS.USER_TOKEN,
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
    return await AsyncStorage.getItem(AUTH_KEYS.USER_TOKEN);
  } catch (error) {
    console.error('Error getting token:', error);
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
