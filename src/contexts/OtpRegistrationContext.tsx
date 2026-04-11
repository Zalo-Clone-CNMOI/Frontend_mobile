import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ConfirmationResult } from 'firebase/auth';

export type Gender = 'male' | 'female';

export type OptionalProfile = {
  fullName?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: Gender;
};

type OtpRegistrationState = {
  phoneE164: string;
  confirmationResult: ConfirmationResult | null;
  firebaseIdToken: string;
  password: string;
  profile: OptionalProfile;
};

type OtpRegistrationContextType = OtpRegistrationState & {
  setPhoneE164: (value: string) => void;
  setConfirmationResult: (value: ConfirmationResult | null) => void;
  setFirebaseIdToken: (value: string) => void;
  setPassword: (value: string) => void;
  setProfile: (value: OptionalProfile) => void;
  reset: () => void;
};

const OtpRegistrationContext = createContext<OtpRegistrationContextType | undefined>(undefined);

export const useOtpRegistration = () => {
  const ctx = useContext(OtpRegistrationContext);
  if (!ctx) throw new Error('useOtpRegistration must be used within OtpRegistrationProvider');
  return ctx;
};

const initialProfile: OptionalProfile = {};

export const OtpRegistrationProvider = ({ children }: { children: ReactNode }) => {
  const [phoneE164, setPhoneE164] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState<OptionalProfile>(initialProfile);

  const value = useMemo<OtpRegistrationContextType>(
    () => ({
      phoneE164,
      confirmationResult,
      firebaseIdToken,
      password,
      profile,
      setPhoneE164,
      setConfirmationResult,
      setFirebaseIdToken,
      setPassword,
      setProfile,
      reset: () => {
        setPhoneE164('');
        setConfirmationResult(null);
        setFirebaseIdToken('');
        setPassword('');
        setProfile(initialProfile);
      },
    }),
    [phoneE164, confirmationResult, firebaseIdToken, password, profile],
  );

  return <OtpRegistrationContext.Provider value={value}>{children}</OtpRegistrationContext.Provider>;
};

