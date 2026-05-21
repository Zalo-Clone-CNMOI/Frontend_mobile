import Constants from "expo-constants";

let confirmationResult: any = null;

const getFirebaseAuth = () => {
  if (Constants.appOwnership === "expo") {
    throw new Error(
      "Firebase phone authentication requires a development build. Expo Go cannot load @react-native-firebase/auth."
    );
  }

  try {
    const auth = require("@react-native-firebase/auth").default;
    return auth();
  } catch (error) {
    throw new Error(
      "Firebase auth native module is unavailable. Rebuild and reinstall the development build after installing @react-native-firebase/app and @react-native-firebase/auth."
    );
  }
};

export const setRecaptchaVerifier = (_verifier: any) => {
};

export const sendOtp = async (phone: string) => {
  confirmationResult = await getFirebaseAuth().signInWithPhoneNumber(phone);
  return confirmationResult;
};

export const confirmOtp = async (code: string) => {
  if (!confirmationResult) {
    throw new Error("OTP session not found. Please request a new code.");
  }
  const result = await confirmationResult.confirm(code);
  return result;
};

export const getFirebaseIdToken = async (): Promise<string> => {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Not authenticated with Firebase. Please verify OTP again.");
  }
  const idToken = await user.getIdToken();
  if (!idToken) {
    throw new Error("Failed to get Firebase ID token.");
  }
  return idToken;
};

export const resetOtpSession = () => {
  confirmationResult = null;
};
