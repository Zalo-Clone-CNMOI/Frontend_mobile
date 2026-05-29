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
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
