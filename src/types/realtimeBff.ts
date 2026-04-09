export type EntityId = string;

export type AccessTokenProvider = () => Promise<string | null>;
export type RefreshAccessTokenProvider = () => Promise<string | null>;

export type RealtimeHostConfig = {
  host?: string;
  httpPort?: number;
  wsPort?: number;
  apiPrefix?: string;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PaginatedResponse<T> = {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
  timestamp?: string;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
};

export type ApiListEnvelope<T> = {
  success: boolean;
  data: T[];
  meta?: PaginationMeta;
  message?: string;
  timestamp?: string;
};

export type FriendApiErrorCode =
  | "SELF_REQUEST"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "RATE_LIMITED"
  | "UNKNOWN";

export type FriendRequestAction = "accepted" | "rejected";
export type FriendRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";

export type FriendRequestListKind = "received" | "sent";

export type FriendUserSummary = {
  id: EntityId;
  fullName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  lastSeenAt?: string | null;
  friendsSince?: string | null;
};

export type FriendRecord = FriendUserSummary & {
  blocked?: boolean;
};

export type FriendRequestRecord = {
  id: EntityId;
  requesterId: EntityId;
  targetUserId: EntityId;
  requester?: FriendUserSummary;
  target?: FriendUserSummary;
  status: FriendRequestStatus;
  createdAt?: string;
  respondedAt?: string;
  message?: string | null;
};

export type GetFriendsParams = {
  page?: number;
  limit?: number;
};

export type GetFriendRequestsParams = GetFriendsParams;

export type CreateFriendRequestPayload = {
  userId: EntityId;
};

export type RespondToFriendRequestPayload = {
  action: FriendRequestAction;
};

export type FriendRequestSendPayload = {
  request: FriendRequestRecord;
  actorUserId?: EntityId;
  targetUserId?: EntityId;
  createdAt?: string;
};

export type FriendRequestRespondPayload = {
  requestId: EntityId;
  action: FriendRequestAction;
  request?: FriendRequestRecord;
  friend?: FriendRecord;
  actorUserId?: EntityId;
  targetUserId?: EntityId;
  respondedAt?: string;
};

export type FriendRequestCancelPayload = {
  requestId: EntityId;
  actorUserId?: EntityId;
  targetUserId?: EntityId;
  cancelledAt?: string;
};

export type FriendRemovedPayload = {
  friendId: EntityId;
  removedByUserId?: EntityId;
  removedAt?: string;
};

export type FriendRealtimeHandlers = {
  onFriendRequestSend?: (payload: FriendRequestSendPayload) => void;
  onFriendRequestRespond?: (payload: FriendRequestRespondPayload) => void;
  onFriendRequestCancel?: (payload: FriendRequestCancelPayload) => void;
  onFriendRemoved?: (payload: FriendRemovedPayload) => void;
};

export type FriendRealtimeState = {
  friends: FriendRecord[];
  receivedRequests: FriendRequestRecord[];
  sentRequests: FriendRequestRecord[];
};

export type FriendApiErrorResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  code?: FriendApiErrorCode | string;
};

export type ChatTypingEmitPayload = {
  conversation_id: EntityId;
  username: string;
};

export type ChatTypingUser = {
  userId?: EntityId;
  user_id?: EntityId;
  username?: string;
  fullName?: string;
  name?: string;
};

export type ChatTypingUpdatePayload = {
  conversation_id: EntityId;
  users: ChatTypingUser[];
  updated_at?: string | number;
};

export type TypingIndicatorState = {
  users: ChatTypingUser[];
  text: string;
  visible: boolean;
};

export type RegisterDeviceTokenPayload = {
  token: string;
  platform: "web";
};

export type RegisterDeviceTokenResponse = {
  id?: EntityId;
  token?: string;
  platform?: "web" | string;
  createdAt?: string;
};

export type NotificationCategory = "friend_request" | "chat" | string;

export type NotificationToastPayload = {
  title: string;
  body: string;
  category?: NotificationCategory;
  data?: Record<string, string>;
};

export type ForegroundNotificationPayload = {
  notification?: {
    title?: string;
    body?: string;
    image?: string;
    icon?: string;
  };
  data?: Record<string, string>;
};

export type NotificationSentPayload = {
  notificationId?: EntityId;
  token?: string;
  category?: NotificationCategory;
  sentAt?: string | number;
};

export type NotificationFailedCode =
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "RATE_LIMITED"
  | string;

export type NotificationFailedPayload = {
  notificationId?: EntityId;
  token?: string;
  category?: NotificationCategory;
  code?: NotificationFailedCode;
  message?: string;
  failedAt?: string | number;
};

export type FirebaseMessagingAdapter = {
  getToken: (options: { vapidKey: string }) => Promise<string>;
  deleteToken?: () => Promise<boolean | void>;
  onMessage: (
    callback: (payload: ForegroundNotificationPayload) => void,
  ) => () => void;
};

export type DeviceTokenRegistrationResult = {
  token: string;
  registeredAt: number;
};

export type NotificationFailureStrategy = "retry_token" | "warn" | "ignore";

export type NotificationRealtimeHandlers = {
  onNotificationSent?: (payload: NotificationSentPayload) => void;
  onNotificationFailed?: (payload: NotificationFailedPayload) => void;
};

export type ToastHandler = (payload: NotificationToastPayload) => void;
export type SoftWarningHandler = (message: string) => void;
