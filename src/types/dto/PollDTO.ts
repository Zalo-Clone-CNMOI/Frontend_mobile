/**
 * Poll Types - Match Backend Contracts
 * Based on Poll Specification Document
 */

export type PollStatus = 'active' | 'closed';

export type PollClosedReason = 'by_creator' | 'by_admin' | 'expired';

export interface PollOption {
  option_id: string;
  label: string;
  order_index: number;
  vote_count: number;
  added_by_user_id?: string | null;
}

export interface PollListItem {
  poll_id: string;
  conversation_id: string;
  creator_id: string;
  question: string;
  status: PollStatus;
  allow_multiple: boolean;
  allow_add_option: boolean;
  expires_at: number | null;
  closed_at: number | null;
  created_at: number;
  options_count: number;
}

export interface PollDetail {
  poll_id: string;
  conversation_id: string;
  creator_id: string;
  question: string;
  status: PollStatus;
  allow_multiple: boolean;
  allow_add_option: boolean;
  expires_at: number | null;
  closed_at: number | null;
  closed_reason?: PollClosedReason | null;
  options: PollOption[];
  my_vote: string[];
  total_votes: number;
  total_voters: number;
}

export interface PollMessageMetadata {
  poll_id: string;
  question: string;
  options: Array<{
    option_id: string;
    label: string;
    order_index: number;
    vote_count: number;
  }>;
  total_votes: number;
  total_voters: number;
  allow_multiple: boolean;
  allow_add_option: boolean;
  status: PollStatus;
  expires_at: number | null;
  closed_at: number | null;
  closed_reason: PollClosedReason | null;
}

// Request DTOs

export interface CreatePollRequestDTO {
  question: string;
  options: Array<{ label: string }>;
  allow_multiple?: boolean;
  allow_add_option?: boolean;
  expires_in_hours?: number;
  is_anonymous?: boolean;
}

export interface CreatePollResponseDTO {
  poll_id: string;
  message_id: string;
  options: Array<{
    option_id: string;
    label: string;
    order_index: number;
  }>;
}

export interface EditPollRequestDTO {
  question?: string;
  allow_multiple?: boolean;
  allow_add_option?: boolean;
  expires_at?: string | null;
  edited_option_labels?: Array<{
    option_id: string;
    label: string;
  }>;
}

export interface EditPollResponseDTO {
  poll_id: string;
  edited_at: number;
}

export interface VoteRequestDTO {
  option_ids: string[];
}

export interface VoteResponseDTO {
  poll_id: string;
  option_ids_added: string[];
  option_ids_removed: string[];
}

export interface RetractVoteResponseDTO {
  poll_id: string;
  deleted: number;
}

export interface AddPollOptionRequestDTO {
  label: string;
}

export interface AddPollOptionResponseDTO {
  option_id: string;
  label: string;
  order_index: number;
}

export interface RemovePollOptionResponseDTO {
  option_id: string;
}

export interface ClosePollResponseDTO {
  poll_id: string;
  status: 'closed';
  final_tally: Array<{
    option_id: string;
    vote_count: number;
  }>;
}

export interface ListPollsQueryDTO {
  status?: 'active' | 'closed';
  page?: number;
  limit?: number;
}

export interface ListPollsResponseDTO {
  items: PollListItem[];
  total: number;
  page: number;
  limit: number;
}

// WebSocket Event Payloads

export interface GroupPollCreatedPayload {
  poll_id: string;
  conversation_id: string;
  message_id: string;
  creator_id: string;
  question: string;
  options: Array<{
    option_id: string;
    label: string;
    order_index: number;
  }>;
  allow_multiple: boolean;
  allow_add_option: boolean;
  expires_at: number | null;
  created_at: number;
}

export interface GroupPollEditedPayload {
  poll_id: string;
  conversation_id: string;
  editor_user_id: string;
  changes: {
    question?: string;
    allow_multiple?: boolean;
    allow_add_option?: boolean;
    expires_at?: number | null;
    edited_option_labels?: Array<{
      option_id: string;
      label: string;
    }>;
  };
  edited_at: number;
}

export interface GroupPollVoteUpdatedPayload {
  poll_id: string;
  conversation_id: string;
  tally: Array<{ option_id: string; vote_count: number }>;
  total_votes: number;
  total_voters: number;
  updated_at: number;
}

export interface GroupPollOptionAddedPayload {
  poll_id: string;
  conversation_id: string;
  option_id: string;
  label: string;
  order_index: number;
  added_by_user_id: string;
}

export interface GroupPollOptionRemovedPayload {
  poll_id: string;
  conversation_id: string;
  option_id: string;
  removed_by_user_id: string;
}

export interface GroupPollClosedPayload {
  poll_id: string;
  conversation_id: string;
  closed_by_user_id: string | null;
  reason: PollClosedReason;
  final_tally: Array<{
    option_id: string;
    vote_count: number;
  }>;
  closed_at: number;
}

// Error codes
export type PollErrorCode =
  | 'POLL_NOT_FOUND'
  | 'POLL_CLOSED'
  | 'POLL_EXPIRED'
  | 'POLL_NOT_GROUP_CONVERSATION'
  | 'POLL_INVALID_OPTION'
  | 'POLL_ADD_OPTION_NOT_ALLOWED'
  | 'POLL_OPTION_LIMIT_REACHED'
  | 'POLL_MIN_OPTIONS_REQUIRED'
  | 'POLL_SINGLE_CHOICE_VIOLATION'
  | 'POLL_DUPLICATE_OPTION_LABEL'
  | 'POLL_PERMISSION_DENIED'
  | 'POLL_CANNOT_EDIT_MULTIPLE_WITH_VOTES'
  | 'POLL_CANNOT_EDIT_OPTION_WITH_VOTES'
  | 'POLL_EXPIRES_AT_IN_PAST'
  | 'POLL_NO_EDIT_FIELDS';

// Constants
export const POLL_CONSTANTS = {
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 20,
  MAX_QUESTION_LENGTH: 500,
  MAX_OPTION_LABEL_LENGTH: 200,
  MAX_EXPIRY_HOURS: 168, // 7 days
  RATE_LIMITS: {
    CREATE: { requests: 10, windowSeconds: 60 },
    LIST: { requests: 30, windowSeconds: 60 },
    DETAIL: { requests: 60, windowSeconds: 60 },
    EDIT: { requests: 10, windowSeconds: 60 },
    VOTE: { requests: 30, windowSeconds: 60 },
    RETRACT: { requests: 30, windowSeconds: 60 },
    ADD_OPTION: { requests: 10, windowSeconds: 60 },
    REMOVE_OPTION: { requests: 10, windowSeconds: 60 },
    CLOSE: { requests: 10, windowSeconds: 60 },
  },
} as const;
