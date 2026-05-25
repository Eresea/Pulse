export type ServiceStatus = "idle" | "connecting" | "connected" | "degraded" | "error";

export type UserInfo = {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  providers: ConnectedProvider[];
  permissions: UserPermission[];
};

export type ConnectorStatus =
  | "connected"
  | "disconnected"
  | "degraded"
  | "error"
  | "pending"
  | "expired"
  | "needsReauth"
  | "locallyAvailable"
  | "remoteOnly"
  | "unsupported"
  | "unknown";

export type ConnectedProvider = {
  id: string;
  name: string;
  email?: string;
  connectedAt?: string;
  status: ConnectorStatus;
  permissions: UserPermission[];
};

export type UserPermission = {
  id: string;
  name: string;
  description?: string;
  granted?: boolean;
};

export type ConnectorActionState = {
  canConnect: boolean;
  canDisconnect: boolean;
  canRefresh: boolean;
  canReauth: boolean;
};

export type ConnectorCatalogItem = {
  id: string;
  displayName: string;
  providerType?: string;
  authMethod?: string;
  capabilities: string[];
  supportedApps: string[];
  supportedModules: string[];
  supportMode?: string;
  status: ConnectorStatus;
  rawStatus?: string;
  statusMessage?: string;
  accountEmail?: string;
  accountName?: string;
  connectedAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  localAvailable: boolean;
  actions: ConnectorActionState;
  actionUrl?: string;
};

export type LoginEmailRequest = {
  email: string;
  password: string;
};

export type RegisterEmailRequest = LoginEmailRequest & {
  displayName: string;
};

export type NexusAuthResult = {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  sessionId?: string;
  userId?: string;
  mfaRequired?: boolean;
  mfaTicket?: string;
};

export type NexusUser = {
  id: string;
  userId?: string;
  email?: string;
  displayName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  avatar?: string;
  picture?: string;
  imageUrl?: string;
  emailVerified?: boolean;
  connectedProviders?: NexusProvider[];
  connectors?: NexusProvider[];
  providers?: NexusProvider[];
  externalLogins?: NexusProvider[];
  permissions?: NexusPermission[];
  scopes?: NexusPermission[];
};

export type NexusProvider = {
  id?: string;
  provider?: string;
  providerName?: string;
  name?: string;
  displayName?: string;
  email?: string;
  connectedAt?: string;
  status?: string;
  state?: string;
  isConnected?: boolean;
  connected?: boolean;
  permissions?: NexusPermission[];
  scopes?: NexusPermission[];
};

export type NexusConnector = {
  id?: string;
  connectorId?: string;
  connector_id?: string;
  key?: string;
  name?: string;
  displayName?: string;
  display_name?: string;
  providerType?: string;
  provider_type?: string;
  authMethod?: string;
  auth_method?: string;
  capabilities?: string[];
  supportedApps?: string[];
  supported_apps?: string[];
  supportedModules?: string[];
  supported_modules?: string[];
  mode?: string;
  supportMode?: string;
  support_mode?: string;
  status?: string;
  statusMessage?: string;
  status_message?: string;
  error?: string;
  accountEmail?: string;
  account_email?: string;
  accountName?: string;
  account_name?: string;
  connectedAt?: string;
  connected_at?: string;
  updatedAt?: string;
  updated_at?: string;
  expiresAt?: string;
  expires_at?: string;
  localAvailable?: boolean;
  local_available?: boolean;
  canConnect?: boolean;
  can_connect?: boolean;
  canDisconnect?: boolean;
  can_disconnect?: boolean;
  canRefresh?: boolean;
  can_refresh?: boolean;
  canReauth?: boolean;
  can_reauth?: boolean;
  actionUrl?: string;
  action_url?: string;
};

export type NexusConnectorListResponse = NexusConnector[] | { connectors?: NexusConnector[] };

export type NexusPermission =
  | string
  | {
      id?: string;
      key?: string;
      scope?: string;
      name?: string;
      displayName?: string;
      description?: string;
      granted?: boolean;
      enabled?: boolean;
      allowed?: boolean;
    };

export type DeviceInfo = {
  deviceId: string;
  fcmToken?: string;
  platform: "android" | "ios" | "web" | "unknown";
  userAgent: string;
};

export type RootsEvent = {
  id: string;
  source: "websocket" | "fcm" | "polling";
  type: string;
  receivedAt: string;
  payload: unknown;
};

export type AiChatRole = "user" | "assistant" | "system";
export type AiToolLifecycleStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled" | "waiting_confirmation";
export type AiToolRisk = "low" | "medium" | "high";

export type AiChatThread = {
  id: string;
  title: string;
  preview?: string;
  lastActivityAt?: string;
  unreadCount?: number;
  status?: "idle" | "streaming" | "error";
};

export type AiChatModel = {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  defaultModel?: boolean;
};

export type AiChatMessage = {
  id: string;
  threadId: string;
  role: AiChatRole;
  content: string;
  createdAt: string;
  status?: "sending" | "streaming" | "sent" | "error";
};

export type AiChatFile = {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  checksum?: string;
  originApp?: string;
  threadId?: string;
  createdAt?: string;
};

export type AiChatReference = {
  id: string;
  type: string;
  title?: string;
  url?: string;
  summary?: string;
  data?: Record<string, unknown>;
};

export type AiChatAttachment = {
  fileId: string;
};

export type AiChatStatusEvent = {
  type: "status";
  status: AiToolLifecycleStatus | "thinking" | "working" | "completed";
  title?: string;
  message?: string;
};

export type AiChatToolCall = {
  id: string;
  name: string;
  title?: string;
  status: AiToolLifecycleStatus;
  risk?: AiToolRisk;
  summary?: string;
  input?: unknown;
  startedAt?: string;
};

export type AiChatToolResult = {
  toolCallId: string;
  status: AiToolLifecycleStatus;
  summary?: string;
  details?: unknown;
  completedAt?: string;
};

export type AiChatConfirmationRequest = {
  id: string;
  toolCallId?: string;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  expiresAt?: string;
};

export type AiChatConfirmationResponse = {
  id: string;
  accepted: boolean;
  respondedAt?: string;
};

export type AiChatUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
};

export type AiChatTimelineEvent = {
  id: string;
  threadId: string;
  createdAt: string;
  event:
    | AiChatStatusEvent
    | { type: "tool_call"; toolCall: AiChatToolCall }
    | { type: "tool_result"; result: AiChatToolResult }
    | { type: "confirmation_request"; confirmation: AiChatConfirmationRequest }
    | { type: "confirmation_response"; response: AiChatConfirmationResponse }
    | { type: "file"; file: AiChatFile }
    | { type: "reference"; reference: AiChatReference }
    | { type: "usage"; usage: AiChatUsage }
    | { type: "error"; message: string };
};

export type AiChatStreamEvent =
  | { type: "thread"; thread: AiChatThread }
  | { type: "message"; message: AiChatMessage }
  | { type: "delta"; delta: string }
  | AiChatStatusEvent
  | { type: "tool_call"; toolCall: AiChatToolCall }
  | { type: "tool_result"; result: AiChatToolResult }
  | { type: "confirmation_request"; confirmation: AiChatConfirmationRequest }
  | { type: "confirmation_response"; response: AiChatConfirmationResponse }
  | { type: "file"; file: AiChatFile }
  | { type: "reference"; reference: AiChatReference }
  | { type: "usage"; usage: AiChatUsage }
  | { type: "done" }
  | { type: "error"; message: string };

export type AiDebugLogLevel = "debug" | "info" | "warn" | "error";

export type AiDebugLogSource = "pulse" | "nexus";

export type AiDebugLogEntry = {
  id: string;
  timestamp: string;
  level: AiDebugLogLevel;
  source: AiDebugLogSource;
  event: string;
  traceId?: string;
  modelId?: string;
  message?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};
