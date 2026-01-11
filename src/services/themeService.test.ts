// Test file for theme service (manual testing)
import { ThemeService } from './themeService';

// Manual test function - run this in your app to verify theme persistence
export const testThemePersistence = async () => {
  console.log('=== Testing Theme Persistence ===');
  
  // Test 1: Save theme mode
  console.log('1. Saving theme mode: dark');
  await ThemeService.saveThemeMode('dark');
  
  // Test 2: Get theme mode
  const savedMode = await ThemeService.getThemeMode();
  console.log('2. Retrieved theme mode:', savedMode);
  
  // Test 3: Save different theme mode
  console.log('3. Saving theme mode: light');
  await ThemeService.saveThemeMode('light');
  
  // Test 4: Get updated theme mode
  const updatedMode = await ThemeService.getThemeMode();
  console.log('4. Retrieved updated theme mode:', updatedMode);
  
  // Test 5: Save system theme
  console.log('5. Saving theme mode: system');
  await ThemeService.saveThemeMode('system');
  
  // Test 6: Get system theme mode
  const systemMode = await ThemeService.getThemeMode();
  console.log('6. Retrieved system theme mode:', systemMode);
  
  console.log('=== Theme Persistence Test Complete ===');
  
  return {
    darkTest: savedMode === 'dark',
    lightTest: updatedMode === 'light',
    systemTest: systemMode === 'system'
  };
};
