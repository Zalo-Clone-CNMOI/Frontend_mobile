import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_MODE_KEY = '@zalo_clone_theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

export class ThemeService {
  /**
   * Lưu theme mode vào AsyncStorage
   */
  static async saveThemeMode(mode: ThemeMode): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  }

  /**
   * Lấy theme mode từ AsyncStorage
   */
  static async getThemeMode(): Promise<ThemeMode> {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_MODE_KEY);
      return savedMode ? (savedMode as ThemeMode) : 'system';
    } catch (error) {
      console.error('Error getting theme mode:', error);
      return 'system';
    }
  }

  /**
   * Xóa theme mode khỏi AsyncStorage
   */
  static async clearThemeMode(): Promise<void> {
    try {
      await AsyncStorage.removeItem(THEME_MODE_KEY);
    } catch (error) {
      console.error('Error clearing theme mode:', error);
    }
  }
}
