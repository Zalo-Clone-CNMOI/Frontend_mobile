import {
  signInWithPhoneNumber,
  type ApplicationVerifier,
  type ConfirmationResult,
} from 'firebase/auth';
import { getFirebaseAuth } from '../firebase';

let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: ApplicationVerifier | null = null;

export const setRecaptchaVerifier = (verifier: ApplicationVerifier | null) => {
  recaptchaVerifier = verifier;
};

export const sendOtp = async (phone: string): Promise<ConfirmationResult> => {
  const auth = getFirebaseAuth();
  if (!recaptchaVerifier) {
    throw new Error('Missing reCAPTCHA verifier. Please try again.');
  }

  confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
  return confirmationResult;
};

export const confirmOtp = async (code: string) => {
  if (!confirmationResult) {
    throw new Error('OTP session not found. Please request a new code.');
  }

  const result = await confirmationResult.confirm(code);
  return result;
};

export const getFirebaseIdToken = async (): Promise<string> => {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated with Firebase. Please verify OTP again.');
  }

  const idToken = await user.getIdToken(true);
  if (!idToken) {
    throw new Error('Failed to get Firebase ID token.');
  }

  return idToken;
};

export const resetOtpSession = () => {
  confirmationResult = null;
};

