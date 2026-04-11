import { Stack } from 'expo-router';
import React from 'react';
import { OtpRegistrationProvider } from '@/src/contexts/OtpRegistrationContext';

export default function AuthLayout() {
  return (
    <OtpRegistrationProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="loginStep1" />
        <Stack.Screen name="loginStep2" />
        <Stack.Screen name="register" />
        <Stack.Screen name="otpVerify" />
        <Stack.Screen name="createPassword" />
        <Stack.Screen name="optionalProfile" />
        <Stack.Screen name="forgotPassword" />
      </Stack>
    </OtpRegistrationProvider>
  );
}

