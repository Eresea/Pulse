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
  source: "signalr" | "fcm" | "polling";
  type: string;
  receivedAt: string;
  payload: unknown;
};
