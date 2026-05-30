// Jest configuration for the Expo (SDK 54) React Native app.
// Uses the jest-expo preset (provides jest + RN/Expo transforms).
// `@/` is mapped to the project root to mirror tsconfig.json "paths".
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Transform the (ESM-shipped) RN/Expo + app deps that Metro would otherwise transpile.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|zustand|socket.io-client|react-native-markdown-display|lucide-react-native|@shopify/flash-list|react-native-reanimated|react-native-gesture-handler|react-native-worklets))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // react-native-localize has no native impl in jest; the jest-expo resolver
    // bypasses the root __mocks__ folder, so map it explicitly to the manual
    // mock. src/i18n/config.ts loads it at import time (findBestLanguageTag).
    '^react-native-localize$': '<rootDir>/__mocks__/react-native-localize.js',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
