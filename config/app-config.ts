import Constants from "expo-constants";

type RootsExtra = {
  apiBaseUrl?: string;
  updateChannel?: string;
  pollingIntervalMs?: number;
};

const roots = (Constants.expoConfig?.extra?.roots ?? {}) as RootsExtra;

export const appConfig = {
  apiBaseUrl: roots.apiBaseUrl ?? "https://nexus.eresea.net",
  updatePath: "/api/v1/updates/check",
  updateChannel: roots.updateChannel ?? "production",
  updatePlatform: "android",
  pollingIntervalMs: roots.pollingIntervalMs ?? 30000,
  realtime: {
    userSocket: "/ws/v1/user"
  },
  auth: {
    clientId: "pulse",
    register: "/api/v1/auth/register",
    loginEmail: "/api/v1/auth/login",
    loginGoogle: "/api/v1/auth/oauth/google/start",
    refresh: "/api/v1/auth/token/refresh",
    logout: "/api/v1/auth/logout",
    me: "/api/v1/me",
    connectors: "/api/v1/connectors?appId=pulse",
    device: (userId: string) => `/api/v1/auth/user/${userId}/device`
  },
  ai: {
    models: "/api/v1/ai/models",
    threads: "/api/v1/ai/chat/threads",
    thread: (threadId: string) => `/api/v1/ai/chat/threads/${encodeURIComponent(threadId)}`,
    messages: (threadId: string) => `/api/v1/ai/chat/threads/${encodeURIComponent(threadId)}/messages`,
    chatStream: "/api/v1/ai/chat/stream"
  },
  sync: {
    events: undefined as string | undefined
  }
} as const;
