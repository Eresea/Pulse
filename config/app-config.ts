import Constants from "expo-constants";

type RootsExtra = {
  apiBaseUrl?: string;
  updateChannel?: string;
  pollingIntervalMs?: number;
};

const roots = (Constants.expoConfig?.extra?.roots ?? {}) as RootsExtra;

export const appConfig = {
  apiBaseUrl: roots.apiBaseUrl ?? "https://roots.eresea.net",
  updateUrl: Constants.expoConfig?.updates?.url ?? "https://roots.eresea.net/api/mobile-updates/pulse",
  updateChannel: roots.updateChannel ?? "production",
  pollingIntervalMs: roots.pollingIntervalMs ?? 30000,
  hubs: {
    chat: "/api/chatHub",
    bellum: "/api/bellumHub",
    battle: "/api/battleHub"
  },
  auth: {
    loginEmail: "/api/auth/login/email",
    loginGoogle: "/api/auth/login/google",
    loginGithub: "/api/auth/login/github",
    refresh: "/api/auth/refresh",
    device: (userId: string) => `/api/auth/user/${userId}/device`
  }
} as const;
