import { Stack } from "expo-router";
import React from "react";

export default function CallLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="calling" />
      <Stack.Screen name="incoming" />
      <Stack.Screen name="active" />
    </Stack>
  );
}
