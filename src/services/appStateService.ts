import { AppState, type AppStateStatus } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';

export type AppStateType = 'active' | 'inactive' | 'background' | 'unknown';

class AppStateService {
  private currentState: AppStateType = 'unknown';
  private listeners: Set<(state: AppStateType) => void> = new Set();
  private subscription: ReturnType<typeof AppState.addEventListener> | null = null;

  initialize() {
    if (this.subscription) return;

    this.currentState = AppState.currentState as AppStateType;

    this.subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const state = nextAppState as AppStateType;
      this.currentState = state;
      this.listeners.forEach((listener) => listener(state));
    });
  }

  cleanup() {
    this.subscription?.remove();
    this.subscription = null;
    this.listeners.clear();
  }

  getCurrentState(): AppStateType {
    return this.currentState;
  }

  isActive(): boolean {
    return this.currentState === 'active';
  }

  isBackground(): boolean {
    return this.currentState === 'background';
  }

  isInactive(): boolean {
    return this.currentState === 'inactive';
  }

  subscribe(listener: (state: AppStateType) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const appStateService = new AppStateService();

// React Hook
export function useAppState() {
  const [state, setState] = useState<AppStateType>(appStateService.getCurrentState());
  const stateRef = useRef(state);

  useEffect(() => {
    appStateService.initialize();
    setState(appStateService.getCurrentState());

    const unsubscribe = appStateService.subscribe((newState) => {
      stateRef.current = newState;
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const isActive = useCallback(() => stateRef.current === 'active', []);
  const isBackground = useCallback(() => stateRef.current === 'background', []);

  return {
    state,
    isActive: state === 'active',
    isBackground: state === 'background',
    isInactive: state === 'inactive',
    isActiveRef: isActive,
    isBackgroundRef: isBackground,
  };
}
