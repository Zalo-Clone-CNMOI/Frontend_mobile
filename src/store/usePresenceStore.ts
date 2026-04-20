import { create } from 'zustand';
import type { PresenceUpdatePayload } from '../realtime';

interface PresenceState {
  presenceMap: Record<string, PresenceUpdatePayload>;
  updatePresence: (userId: string, payload: PresenceUpdatePayload) => void;
  removePresence: (userId: string) => void;
  reset: () => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  presenceMap: {},
  
  updatePresence: (userId: string, payload: PresenceUpdatePayload) => {
    set((state) => ({
      presenceMap: {
        ...state.presenceMap,
        [userId]: payload,
      },
    }));
  },
  
  removePresence: (userId: string) => {
    set((state) => {
      const newMap = { ...state.presenceMap };
      delete newMap[userId];
      return { presenceMap: newMap };
    });
  },
  
  reset: () => {
    set({ presenceMap: {} });
  },
}));
