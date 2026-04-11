import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import type { Auth, Persistence } from "firebase/auth";
import * as firebaseAuth from "firebase/auth";


type FirebaseConfig = {
  apiKey: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

const readEnv = (key: string) => {
  const value = String(
    process.env[key as keyof NodeJS.ProcessEnv] || "",
  ).trim();
  return value;
};

export const FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: readEnv("EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: readEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: readEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: readEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readEnv("EXPO_PUBLIC_FIREBASE_APP_ID"),
  measurementId: readEnv("EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID"),
};

const assertFirebaseConfig = () => {
  if (!FIREBASE_CONFIG.apiKey) {
    throw new Error(
      "Missing Firebase config. Please set EXPO_PUBLIC_FIREBASE_API_KEY (and other EXPO_PUBLIC_FIREBASE_* env vars).",
    );
  }
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (cachedApp) return cachedApp;
  assertFirebaseConfig();
  cachedApp = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);

  if (typeof window !== "undefined") {
    try {
      const firebaseCompat = require("firebase/compat/app")?.default;
      if (firebaseCompat && !firebaseCompat.apps?.length) {
        firebaseCompat.initializeApp(FIREBASE_CONFIG as any);
      }
    } catch {
    }
  }

  return cachedApp;
};

export const getFirebaseAuth = (): Auth => {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseApp();

  const auth = (() => {
    try {
      const getReactNativePersistence = (firebaseAuth as any)
        .getReactNativePersistence as (storage: unknown) => Persistence;

      return firebaseAuth.initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      return firebaseAuth.getAuth(app);
    }
  })();

  cachedAuth = auth;
  return auth;
};
