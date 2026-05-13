export type ServiceStatus = "idle" | "connecting" | "connected" | "degraded" | "error";

export type UserInfo = {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
};

export type LoginEmailRequest = {
  email: string;
  password: string;
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
