import Constants from "expo-constants";

const readEnv = (key: string) => {
  return String(process.env[key as keyof NodeJS.ProcessEnv] || "").trim();
};

export const FIREBASE_CONFIG = {
  apiKey: readEnv("EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: readEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: readEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: readEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readEnv("EXPO_PUBLIC_FIREBASE_APP_ID"),
};

export const getFirebaseApp = () => {
  return FIREBASE_CONFIG;
};

export const getFirebaseAuth = () => {
  if (Constants.appOwnership === "expo") {
    throw new Error(
      "Firebase auth requires a development build. Expo Go cannot load @react-native-firebase/auth."
    );
  }

  const auth = require("@react-native-firebase/auth").default;
  return auth();
};
