import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_MODE_KEY = '@zalo_clone_theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

export class ThemeService {
  static async saveThemeMode(mode: ThemeMode): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (error) {
    }
  }

  static async getThemeMode(): Promise<ThemeMode> {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_MODE_KEY);
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        return savedMode;
      }
      return 'dark';
    } catch (error) {
      return 'dark';
    }
  }

  static async clearThemeMode(): Promise<void> {
    try {
      await AsyncStorage.removeItem(THEME_MODE_KEY);
    } catch (error) {
    }
  }
}
