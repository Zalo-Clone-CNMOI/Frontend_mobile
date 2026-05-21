import auth from "@react-native-firebase/auth";

let confirmationResult: any = null;

export const setRecaptchaVerifier = (_verifier: any) => {
};

export const sendOtp = async (phone: string) => {
  confirmationResult = await auth().signInWithPhoneNumber(phone);
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
  const user = auth().currentUser;
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
