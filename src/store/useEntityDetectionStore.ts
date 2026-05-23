import { create } from 'zustand';

export interface DetectedEntity {
  text: string;
  type: 'tool' | 'company' | 'person' | 'concept' | 'location' | 'product' | 'other';
  start_index: number;
  end_index: number;
  confidence: number;
}

interface EntityDetectionState {
  entitiesByMessage: Map<string, DetectedEntity[]>;

  getEntities(messageId: string): DetectedEntity[];
  setEntities(messageId: string, entities: DetectedEntity[]): void;
  clearEntities(messageId: string): void;
  clearAll(): void;
}

export const useEntityDetectionStore = create<EntityDetectionState>((set, get) => ({
  entitiesByMessage: new Map(),

  getEntities: (messageId) => {
    return get().entitiesByMessage.get(messageId) || [];
  },

  setEntities: (messageId, entities) => {
    set((state) => {
      const newEntities = new Map(state.entitiesByMessage);
      newEntities.set(messageId, entities);
      return { entitiesByMessage: newEntities };
    });
  },

  clearEntities: (messageId) => {
    set((state) => {
      const newEntities = new Map(state.entitiesByMessage);
      newEntities.delete(messageId);
      return { entitiesByMessage: newEntities };
    });
  },

  clearAll: () => {
    set({ entitiesByMessage: new Map() });
  },
}));