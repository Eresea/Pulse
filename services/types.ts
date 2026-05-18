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
};

export type ConnectedProvider = {
  id: string;
  name: string;
  email?: string;
  connectedAt?: string;
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
  providers?: NexusProvider[];
  externalLogins?: NexusProvider[];
};

export type NexusProvider = {
  id?: string;
  provider?: string;
  providerName?: string;
  name?: string;
  displayName?: string;
  email?: string;
  connectedAt?: string;
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

export type AiChatStreamEvent =
  | { type: "thread"; thread: AiChatThread }
  | { type: "message"; message: AiChatMessage }
  | { type: "delta"; delta: string }
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
