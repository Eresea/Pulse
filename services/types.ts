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
  category?: string;
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
  roles?: NexusRole[];
  claims?: NexusClaim[] | Record<string, boolean | string | number | null | undefined>;
  featureOverrides?: Record<string, boolean | string | number | null | undefined>;
  feature_overrides?: Record<string, boolean | string | number | null | undefined>;
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

export type NexusRole =
  | string
  | {
      id?: string;
      key?: string;
      roleKey?: string;
      role_key?: string;
      name?: string;
      displayName?: string;
      description?: string;
      granted?: boolean;
      enabled?: boolean;
      assigned?: boolean;
    };

export type NexusClaim = {
  id?: string;
  key?: string;
  claimKey?: string;
  claim_key?: string;
  name?: string;
  displayName?: string;
  value?: boolean | string | number | null;
  granted?: boolean;
  enabled?: boolean;
  allowed?: boolean;
  description?: string;
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

export type AgentStatus = "idle" | "running" | "waiting_input" | "blocked" | "paused" | "failed" | "completed";
export type AgentTimelineEventType = "blackboard" | "message" | "approval" | "log" | "artifact" | "error";

export type AgentProgress = {
  current?: number;
  total?: number;
  label?: string;
  percent?: number;
};

export type AgentArtifact = {
  id: string;
  title: string;
  type?: string;
  url?: string;
  summary?: string;
  createdAt?: string;
};

export type AgentContextReference = {
  id: string;
  title: string;
  type?: string;
  url?: string;
  summary?: string;
};

export type AgentDecision = {
  id: string;
  title: string;
  rationale?: string;
  createdAt?: string;
};

export type AgentTask = {
  id: string;
  title: string;
  status?: AgentStatus;
  summary?: string;
};

export type AgentRelations = {
  parentAgentId?: string;
  childAgentIds: string[];
  taskIds: string[];
};

export type AgentProfile = {
  id: string;
  name: string;
  description?: string;
  role?: string;
  runtime?: string;
  location?: string;
  capabilities: string[];
  defaultObjective?: string;
};

export type AgentBlackboard = {
  objective?: string;
  plan: string[];
  activeStep?: string;
  decisions: AgentDecision[];
  blockers: string[];
  artifacts: AgentArtifact[];
  contextReferences: AgentContextReference[];
  recentUpdates: string[];
  updatedAt?: string;
};

export type AgentApprovalRequest = {
  id: string;
  agentId: string;
  title: string;
  body: string;
  risk?: AiToolRisk;
  confirmLabel?: string;
  cancelLabel?: string;
  requestedAt?: string;
  expiresAt?: string;
  status: "pending" | "approved" | "rejected";
};

export type AgentSummary = {
  id: string;
  name: string;
  profileId?: string;
  profileName?: string;
  objective?: string;
  status: AgentStatus;
  location?: string;
  runtime?: string;
  owner?: string;
  progress?: AgentProgress;
  needsAttention: boolean;
  lastUpdate?: string;
  updatedAt?: string;
  relations?: AgentRelations;
  tasks?: AgentTask[];
  blackboardId?: string;
  objectiveId?: string;
};

export type AgentGraphNode = {
  id: string;
  type: "agent" | "task";
  title: string;
  subtitle?: string;
  status?: AgentStatus;
  depth: number;
  agentId?: string;
};

export type AgentGraphEdge = {
  id: string;
  fromId: string;
  toId: string;
  type: "child" | "task" | "related";
};

export type AgentGraph = {
  nodes: AgentGraphNode[];
  edges: AgentGraphEdge[];
};

export type AgentTimelineEvent = {
  id: string;
  agentId: string;
  type: AgentTimelineEventType;
  title: string;
  body?: string;
  createdAt: string;
  severity?: "info" | "warning" | "error";
  approval?: AgentApprovalRequest;
  artifact?: AgentArtifact;
};

export type AgentDetail = AgentSummary & {
  blackboard: AgentBlackboard;
  timeline: AgentTimelineEvent[];
  approvals: AgentApprovalRequest[];
};

export type AgentSpawnRequest = {
  objective: string;
  profileId?: string;
  runtime?: string;
  location?: string;
  blackboardId?: string;
};

export type AgentInstructionRequest = {
  message: string;
};

export type AgentApprovalResponse = {
  accepted: boolean;
  respondedAt?: string;
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
