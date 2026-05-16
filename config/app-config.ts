import Constants from "expo-constants";

type RootsExtra = {
  apiBaseUrl?: string;
  updateChannel?: string;
  pollingIntervalMs?: number;
};

const roots = (Constants.expoConfig?.extra?.roots ?? {}) as RootsExtra;

export const appConfig = {
  apiBaseUrl: roots.apiBaseUrl ?? "https://nexus.eresea.net",
  updateUrl: Constants.expoConfig?.updates?.url ?? "https://nexus.eresea.net/api/mobile-updates/pulse",
  updateChannel: roots.updateChannel ?? "production",
  pollingIntervalMs: roots.pollingIntervalMs ?? 30000,
  hubs: {
    chat: "/api/chatHub",
    bellum: "/api/bellumHub",
    battle: "/api/battleHub"
  },
  auth: {
    clientId: "pulse",
    register: "/api/v1/auth/register",
    loginEmail: "/api/v1/auth/login",
    loginGoogle: "/api/v1/auth/oauth/google/start",
    refresh: "/api/v1/auth/token/refresh",
    logout: "/api/v1/auth/logout",
    me: "/api/v1/me",
    device: (userId: string) => `/api/v1/auth/user/${userId}/device`
  }
} as const;
