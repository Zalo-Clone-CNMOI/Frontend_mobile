import type { DetectedEntity } from '@/src/store/useEntityDetectionStore';

// Reuse the detection union as the single source of truth for entity types.
export type EntityType = DetectedEntity['type'];

export type EntityInfoLang = 'vi' | 'en';

// Mirrors the BFF wire shape exactly (snake_case):
// apps/bff-service/src/modules/entity-info/dto/entity-info-response.dto.ts
export interface EntityInfoResponse {
  entity_text: string;
  entity_type: EntityType;
  title: string;
  summary: string;
  details: string;
  related_entities?: string[];
  provider: string;
  tokens_used: number;
  processed_at: number;
}
