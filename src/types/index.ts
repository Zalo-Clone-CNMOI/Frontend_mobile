// Consolidated type exports for Frontend Mobile
// Following patterns from refactor/Frontend_web/src/common/interface

// DTOs (API response types) - exclude conflicting ReactionType
export type {
  ID,
  ApiErrorDTO,
  ApiMetaDTO,
  ApiResponseDTO,
  ApiListResponseDTO,
  ApiUserDTO,
  ApiAttachmentDTO,
  ApiAttachmentType,
  ApiMessageDTO,
  ApiConversationDTO,
  ApiConversationLastMessageDTO,
  GroupInviteDTO,
  GroupInviteStatus,
  SendGroupInvitesDTO,
  SendGroupInvitesResponseDTO,
  GetGroupInvitesQueryDTO,
  MessageReactionDto,
  ReactionSummaryDto,
  MessageReactionsResponseDto,
} from './dto/ApiDTO';

// Mappers - exclude conflicting PinnedMessageItem (use from interface instead)
export {
  mapApiMessageToChatMessage,
  mapSocketMessageEventToChatMessage,
  mapApiConversationToConversationV2,
  mapApiUserToContactUser,
  mapMessagesListFromApi,
  mapConversationsListFromApi,
  mapPinnedMessagesListFromApi,
  mapApiPinnedMessageToChatMessageItem,
} from './mappers/DTOMappers';
export type {
  PinnedMessageItemDTO,
} from './mappers/DTOMappers';

// UI Interface types (clean camelCase for frontend use)
// Note: ReactionType from interface should be used instead of ApiDTO
export * from './interface';

// Legacy exports - gradually migrate to interface/
export type {
  ConversationV2,
  MessageType,
  SystemEventType,
  SystemMessageMetadata,
  FileInfo,
  ReplyInfo,
  ForwardedFrom,
  ChatMessage,
} from './chat';
export type { Contact, ContactUser } from './contacts';
export type { DiscoveryFeature } from './discovery';
export type { SearchResult } from './search';
export type { TimelinePost } from './timeline';

// Re-export realtime types with 'type' keyword
export type {
  EntityId,
  AccessTokenProvider,
  RefreshAccessTokenProvider,
  RealtimeHostConfig,
  PaginationMeta,
  PaginatedResponse,
  ApiEnvelope,
  ApiListEnvelope,
} from './realtimeBff';
