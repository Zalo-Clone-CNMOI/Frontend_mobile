import { NETWORK_CONFIG } from '../config/network';
import { apiCallWithRefresh } from './authService';
import {
  CreatePollRequestDTO,
  CreatePollResponseDTO,
  EditPollRequestDTO,
  EditPollResponseDTO,
  VoteRequestDTO,
  VoteResponseDTO,
  RetractVoteResponseDTO,
  AddPollOptionRequestDTO,
  AddPollOptionResponseDTO,
  RemovePollOptionResponseDTO,
  ClosePollResponseDTO,
  ListPollsQueryDTO,
  ListPollsResponseDTO,
  PollDetail,
  POLL_CONSTANTS,
  PollErrorCode,
} from '../types/dto/PollDTO';

const API_BASE_URL = NETWORK_CONFIG.API_BASE_URL;

// Convert params object to query string
const toQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

// Make HTTP request with auth refresh
const request = async (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
) => {
  const response = await apiCallWithRefresh(`${API_BASE_URL}${path}`, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  // Handle nested API response structure (data.data)
  const actualData = data?.data ?? data;

  if (!response.ok) {
    // Helper to extract error message safely
    const extractMessage = (val: unknown): string | null => {
      if (typeof val === 'string') return val;
      if (val && typeof val === 'object') {
        if ('message' in val && typeof (val as any).message === 'string') return (val as any).message;
        return JSON.stringify(val);
      }
      return null;
    };

    const errorMessage =
      extractMessage(actualData?.message) ||
      extractMessage(actualData?.error) ||
      extractMessage(data?.message) ||
      extractMessage(data?.error) ||
      `Request failed (${response.status})`;

    const error = new Error(errorMessage) as Error & {
      status?: number;
      code?: PollErrorCode | string;
      data?: any;
    };
    error.status = response.status;
    error.code = actualData?.error_code || actualData?.code || data?.error_code || data?.code;
    error.data = data;
    throw error;
  }

  return { data: actualData, status: response.status };
};

// ==================== Validation Helpers ====================

/**
 * Validate poll creation request
 */
export const validateCreatePoll = (payload: CreatePollRequestDTO): string | null => {
  if (!payload.question || payload.question.trim().length === 0) {
    return 'Question is required';
  }
  if (payload.question.length > POLL_CONSTANTS.MAX_QUESTION_LENGTH) {
    return `Question must not exceed ${POLL_CONSTANTS.MAX_QUESTION_LENGTH} characters`;
  }
  if (!payload.options || !Array.isArray(payload.options)) {
    return 'Options must be an array';
  }
  if (payload.options.length < POLL_CONSTANTS.MIN_OPTIONS) {
    return `At least ${POLL_CONSTANTS.MIN_OPTIONS} options are required`;
  }
  if (payload.options.length > POLL_CONSTANTS.MAX_OPTIONS) {
    return `Cannot exceed ${POLL_CONSTANTS.MAX_OPTIONS} options`;
  }

  const labels = new Set<string>();
  for (const option of payload.options) {
    if (!option.label || option.label.trim().length === 0) {
      return 'Option label cannot be empty';
    }
    if (option.label.length > POLL_CONSTANTS.MAX_OPTION_LABEL_LENGTH) {
      return `Option label must not exceed ${POLL_CONSTANTS.MAX_OPTION_LABEL_LENGTH} characters`;
    }
    const normalizedLabel = option.label.trim().toLowerCase();
    if (labels.has(normalizedLabel)) {
      return `Duplicate option label: ${option.label}`;
    }
    labels.add(normalizedLabel);
  }

  if (payload.expires_in_hours !== undefined) {
    if (payload.expires_in_hours < 1 || payload.expires_in_hours > POLL_CONSTANTS.MAX_EXPIRY_HOURS) {
      return `Expiry must be between 1 and ${POLL_CONSTANTS.MAX_EXPIRY_HOURS} hours`;
    }
  }

  return null;
};

/**
 * Validate edit poll request
 */
export const validateEditPoll = (payload: EditPollRequestDTO): string | null => {
  const hasChanges =
    payload.question !== undefined ||
    payload.allow_multiple !== undefined ||
    payload.allow_add_option !== undefined ||
    payload.expires_at !== undefined ||
    (payload.edited_option_labels && payload.edited_option_labels.length > 0);

  if (!hasChanges) {
    return 'At least one field must be provided for edit';
  }

  if (payload.question !== undefined) {
    if (payload.question.length > POLL_CONSTANTS.MAX_QUESTION_LENGTH) {
      return `Question must not exceed ${POLL_CONSTANTS.MAX_QUESTION_LENGTH} characters`;
    }
  }

  if (payload.edited_option_labels) {
    for (const option of payload.edited_option_labels) {
      if (!option.label || option.label.trim().length === 0) {
        return 'Option label cannot be empty';
      }
      if (option.label.length > POLL_CONSTANTS.MAX_OPTION_LABEL_LENGTH) {
        return `Option label must not exceed ${POLL_CONSTANTS.MAX_OPTION_LABEL_LENGTH} characters`;
      }
    }
  }

  return null;
};

/**
 * Validate vote request
 */
export const validateVote = (
  optionIds: string[],
  allowMultiple: boolean,
  existingOptions: { option_id: string }[],
): string | null => {
  if (!optionIds || !Array.isArray(optionIds)) {
    return 'option_ids must be an array';
  }
  if (optionIds.length === 0) {
    return 'At least one option must be selected';
  }

  const validOptionIds = new Set(existingOptions.map(o => o.option_id));
  for (const id of optionIds) {
    if (!validOptionIds.has(id)) {
      return `Invalid option_id: ${id}`;
    }
  }

  if (!allowMultiple && optionIds.length > 1) {
    return 'This poll only allows single choice';
  }

  if (optionIds.length > POLL_CONSTANTS.MAX_OPTIONS) {
    return `Cannot select more than ${POLL_CONSTANTS.MAX_OPTIONS} options`;
  }

  return null;
};

/**
 * Validate add option request
 */
export const validateAddOption = (label: string, existingOptions: { label: string }[]): string | null => {
  if (!label || label.trim().length === 0) {
    return 'Option label is required';
  }
  if (label.length > POLL_CONSTANTS.MAX_OPTION_LABEL_LENGTH) {
    return `Option label must not exceed ${POLL_CONSTANTS.MAX_OPTION_LABEL_LENGTH} characters`;
  }
  if (existingOptions.length >= POLL_CONSTANTS.MAX_OPTIONS) {
    return `Cannot exceed ${POLL_CONSTANTS.MAX_OPTIONS} options`;
  }

  const normalizedLabel = label.trim().toLowerCase();
  const hasDuplicate = existingOptions.some(
    o => o.label.trim().toLowerCase() === normalizedLabel
  );
  if (hasDuplicate) {
    return `Option label "${label}" already exists`;
  }

  return null;
};

// ==================== API Endpoints ====================

/**
 * Create a new poll in a group conversation
 * POST /conversations/:conversationId/polls
 * Rate limit: 10 requests / 60s per user
 */
export const createPoll = async (
  conversationId: string,
  payload: CreatePollRequestDTO,
): Promise<{ data: CreatePollResponseDTO; status: number }> => {
  const validationError = validateCreatePoll(payload);
  if (validationError) {
    throw new Error(validationError);
  }

  const result = await request(
    'POST',
    `/conversations/${encodeURIComponent(conversationId)}/polls`,
    payload,
  );
  return result as { data: CreatePollResponseDTO; status: number };
};

/**
 * List polls in a conversation
 * GET /conversations/:conversationId/polls
 * Rate limit: 30 requests / 60s
 */
export const listPolls = async (
  conversationId: string,
  params?: ListPollsQueryDTO,
): Promise<{ data: ListPollsResponseDTO; status: number }> => {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(50, Math.max(1, params?.limit || 20));

  const queryParams: Record<string, string | number | undefined> = { page, limit };
  if (params?.status) {
    queryParams.status = params.status;
  }

  const result = await request(
    'GET',
    `/conversations/${encodeURIComponent(conversationId)}/polls${toQueryString(queryParams)}`,
  );
  return result as { data: ListPollsResponseDTO; status: number };
};

/**
 * Get poll detail
 * GET /conversations/:conversationId/polls/:pollId
 * Rate limit: 60 requests / 60s
 */
export const getPollDetail = async (
  conversationId: string,
  pollId: string,
): Promise<{ data: PollDetail; status: number }> => {
  const result = await request(
    'GET',
    `/conversations/${encodeURIComponent(conversationId)}/polls/${encodeURIComponent(pollId)}`,
  );
  return result as { data: PollDetail; status: number };
};

/**
 * Edit poll
 * PATCH /conversations/:conversationId/polls/:pollId
 * Permission: Poll creator only
 * Rate limit: 10 requests / 60s
 */
export const editPoll = async (
  conversationId: string,
  pollId: string,
  payload: EditPollRequestDTO,
): Promise<{ data: EditPollResponseDTO; status: number }> => {
  const validationError = validateEditPoll(payload);
  if (validationError) {
    throw new Error(validationError);
  }

  console.log('[pollsApi] editPoll payload:', JSON.stringify(payload, null, 2));

  const result = await request(
    'PATCH',
    `/conversations/${encodeURIComponent(conversationId)}/polls/${encodeURIComponent(pollId)}`,
    payload,
  );
  return result as { data: EditPollResponseDTO; status: number };
};

/**
 * Cast or replace vote
 * POST /conversations/:conversationId/polls/:pollId/vote
 * Rate limit: 30 requests / 60s
 * Note: This is a replace operation, not additive
 */
export const castVote = async (
  conversationId: string,
  pollId: string,
  payload: VoteRequestDTO,
): Promise<{ data: VoteResponseDTO; status: number }> => {
  if (!payload.option_ids || !Array.isArray(payload.option_ids)) {
    throw new Error('option_ids must be an array');
  }
  if (payload.option_ids.length === 0) {
    throw new Error('At least one option must be selected');
  }

  const result = await request(
    'POST',
    `/conversations/${encodeURIComponent(conversationId)}/polls/${encodeURIComponent(pollId)}/vote`,
    payload,
  );
  return result as { data: VoteResponseDTO; status: number };
};

/**
 * Retract all votes
 * DELETE /conversations/:conversationId/polls/:pollId/vote
 * Rate limit: 30 requests / 60s
 */
export const retractVote = async (
  conversationId: string,
  pollId: string,
): Promise<{ data: RetractVoteResponseDTO; status: number }> => {
  const result = await request(
    'DELETE',
    `/conversations/${encodeURIComponent(conversationId)}/polls/${encodeURIComponent(pollId)}/vote`,
  );
  return result as { data: RetractVoteResponseDTO; status: number };
};

/**
 * Add a new option to poll
 * POST /conversations/:conversationId/polls/:pollId/options
 * Permission: Requires allow_add_option = true
 * Rate limit: 10 requests / 60s
 */
export const addPollOption = async (
  conversationId: string,
  pollId: string,
  payload: AddPollOptionRequestDTO,
): Promise<{ data: AddPollOptionResponseDTO; status: number }> => {
  if (!payload.label || payload.label.trim().length === 0) {
    throw new Error('Option label is required');
  }
  if (payload.label.length > POLL_CONSTANTS.MAX_OPTION_LABEL_LENGTH) {
    throw new Error(`Option label must not exceed ${POLL_CONSTANTS.MAX_OPTION_LABEL_LENGTH} characters`);
  }

  const result = await request(
    'POST',
    `/conversations/${encodeURIComponent(conversationId)}/polls/${encodeURIComponent(pollId)}/options`,
    payload,
  );
  return result as { data: AddPollOptionResponseDTO; status: number };
};

/**
 * Remove an option from poll
 * DELETE /conversations/:conversationId/polls/:pollId/options/:optionId
 * Permission: Poll creator only, option must have zero votes
 * Rate limit: 10 requests / 60s
 */
export const removePollOption = async (
  conversationId: string,
  pollId: string,
  optionId: string,
): Promise<{ data: RemovePollOptionResponseDTO; status: number }> => {
  const result = await request(
    'DELETE',
    `/conversations/${encodeURIComponent(conversationId)}/polls/${encodeURIComponent(pollId)}/options/${encodeURIComponent(optionId)}`,
  );
  return result as { data: RemovePollOptionResponseDTO; status: number };
};

/**
 * Close a poll
 * POST /conversations/:conversationId/polls/:pollId/close
 * Permission: Poll creator OR group owner/admin
 * Rate limit: 10 requests / 60s
 */
export const closePoll = async (
  conversationId: string,
  pollId: string,
): Promise<{ data: ClosePollResponseDTO; status: number }> => {
  const result = await request(
    'POST',
    `/conversations/${encodeURIComponent(conversationId)}/polls/${encodeURIComponent(pollId)}/close`,
  );
  return result as { data: ClosePollResponseDTO; status: number };
};

// ==================== Helper Functions ====================

/**
 * Check if user can edit poll (must be creator)
 */
export const canEditPoll = (poll: { creator_id: string }, currentUserId: string): boolean => {
  return poll.creator_id === currentUserId;
};

/**
 * Check if user can close poll (creator or admin)
 */
export const canClosePoll = (
  poll: { creator_id: string; status: string },
  currentUserId: string,
  userRole?: 'owner' | 'admin' | 'member',
): boolean => {
  if (poll.status !== 'active') return false;
  if (poll.creator_id === currentUserId) return true;
  if (userRole === 'owner' || userRole === 'admin') return true;
  return false;
};

/**
 * Check if user can add option
 */
export const canAddOption = (poll: { allow_add_option: boolean; status: string }): boolean => {
  return poll.status === 'active' && poll.allow_add_option;
};

/**
 * Check if user can remove option (creator only, option must have no votes)
 */
export const canRemoveOption = (
  poll: { creator_id: string },
  option: { added_by_user_id?: string | null; vote_count: number },
  currentUserId: string,
  isCreator: boolean,
): boolean => {
  if (!isCreator) return false;
  if (option.vote_count > 0) return false;
  return true;
};

/**
 * Check if poll is expired
 */
export const isPollExpired = (poll: { expires_at: number | null; status: string }): boolean => {
  if (poll.status !== 'active') return false;
  if (!poll.expires_at) return false;
  return Date.now() > poll.expires_at;
};

/**
 * Format expiry countdown
 */
export const formatExpiryCountdown = (expiresAt: number | null): string | null => {
  if (!expiresAt) return null;

  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export default {
  createPoll,
  listPolls,
  getPollDetail,
  editPoll,
  castVote,
  retractVote,
  addPollOption,
  removePollOption,
  closePoll,
  validateCreatePoll,
  validateEditPoll,
  validateVote,
  validateAddOption,
  canEditPoll,
  canClosePoll,
  canAddOption,
  canRemoveOption,
  isPollExpired,
  formatExpiryCountdown,
};
