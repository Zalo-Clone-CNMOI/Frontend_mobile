import React, { createContext, useContext, useEffect, useState } from 'react';
import { isWebRTCAvailable, loadWebRTC } from '../utils/webrtcLoader';

interface WebRTCContextValue {
  isAvailable: boolean;
  isInitialized: boolean;
}

const WebRTCContext = createContext<WebRTCContextValue>({
  isAvailable: false,
  isInitialized: false,
});

export function useWebRTC() {
  return useContext(WebRTCContext);
}

export function WebRTCProvider({ children }: { children: React.ReactNode }) {
  const isAvailable = isWebRTCAvailable();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isAvailable) {
      setIsInitialized(false);
      return;
    }

    let cancelled = false;

    loadWebRTC().then((mod) => {
      if (!cancelled) {
        setIsInitialized(Boolean(mod));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAvailable]);

  return (
    <WebRTCContext.Provider value={{ isAvailable, isInitialized }}>
      {children}
    </WebRTCContext.Provider>
  );
}
