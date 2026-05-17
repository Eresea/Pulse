import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authService } from "@/services/auth";
import { pollingService } from "@/services/polling";
import { pushService } from "@/services/push";
import { realtimeService } from "@/services/realtime";
import { updateService } from "@/services/updates";
import type { ServiceStatus, UserInfo } from "@/services/types";

type AppState = {
  session: {
    isAuthenticated: boolean;
    isRestoring: boolean;
    user?: UserInfo;
  };
  realtime: {
    status: ServiceStatus;
  };
  push: {
    token?: string;
    permissionStatus: string;
  };
  polling: {
    status: "idle" | "running" | "error";
  };
  updates: {
    status: string;
  };
  actions: {
    bootstrap: () => void;
    checkForUpdates: () => void;
    completeLogin: (accessToken: string, refreshToken?: string) => Promise<void>;
    loginEmail: (email: string, password: string) => Promise<void>;
    prefetchUser: () => Promise<UserInfo | undefined>;
    refreshUser: () => Promise<UserInfo>;
    registerEmail: (email: string, password: string, displayName: string) => Promise<void>;
    signOut: () => Promise<void>;
  };
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [realtimeStatus, setRealtimeStatus] = useState<ServiceStatus>("idle");
  const [pushToken, setPushToken] = useState<string | undefined>();
  const [pushPermission, setPushPermission] = useState("not requested");
  const [pollingStatus, setPollingStatus] = useState<"idle" | "running" | "error">("idle");
  const [updateStatus, setUpdateStatus] = useState("idle");
  const [user, setUser] = useState<UserInfo | undefined>();
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const userRefreshPromise = useRef<Promise<UserInfo> | null>(null);
  const autoUpdateStarted = useRef(false);

  useEffect(() => {
    if (autoUpdateStarted.current) {
      return;
    }

    autoUpdateStarted.current = true;
    setUpdateStatus("checking");
    void updateService
      .checkFetchAndReload()
      .then((result) => setUpdateStatus(result.status))
      .catch(() => setUpdateStatus("error"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    void authService
      .restoreSession()
      .then((nextUser) => {
        if (!cancelled) {
          setUser(nextUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AppState>(
    () => ({
      session: {
        isAuthenticated: Boolean(user),
        isRestoring: isRestoringSession,
        user
      },
      realtime: {
        status: realtimeStatus
      },
      push: {
        token: pushToken,
        permissionStatus: pushPermission
      },
      polling: {
        status: pollingStatus
      },
      updates: {
        status: updateStatus
      },
      actions: {
        bootstrap: () => {
          realtimeService.subscribeStatus(setRealtimeStatus);
          void realtimeService.connectChat().catch(() => setRealtimeStatus("error"));

          void pushService
            .requestToken()
            .then((result) => {
              setPushToken(result.token);
              setPushPermission(result.permissionStatus);
            })
            .catch(() => setPushPermission("error"));

          pollingService.start();
          setPollingStatus("running");
        },
        checkForUpdates: () => {
          setUpdateStatus("checking");
          void updateService
            .checkAndFetch()
            .then((result) => setUpdateStatus(result.status))
            .catch(() => setUpdateStatus("error"));
        },
        completeLogin: async (accessToken: string, refreshToken?: string) => {
          const nextUser = await authService.completeLogin({ accessToken, refreshToken, tokenType: "Bearer" });
          setUser(nextUser);
        },
        loginEmail: async (email: string, password: string) => {
          const nextUser = await authService.loginEmail({ email, password });
          setUser(nextUser);
        },
        prefetchUser: async () => {
          if (user) {
            return user;
          }

          if (!userRefreshPromise.current) {
            userRefreshPromise.current = authService.me()
              .then((nextUser) => {
                setUser(nextUser);
                return nextUser;
              })
              .finally(() => {
                userRefreshPromise.current = null;
              });
          }

          return userRefreshPromise.current;
        },
        refreshUser: async () => {
          if (!userRefreshPromise.current) {
            userRefreshPromise.current = authService.me().finally(() => {
              userRefreshPromise.current = null;
            });
          }

          const nextUser = await userRefreshPromise.current;
          setUser(nextUser);
          return nextUser;
        },
        registerEmail: async (email: string, password: string, displayName: string) => {
          await authService.registerEmail({ email, password, displayName });
        },
        signOut: async () => {
          await authService.signOut();
          setUser(undefined);
        }
      }
    }),
    [isRestoringSession, pollingStatus, pushPermission, pushToken, realtimeStatus, updateStatus, user]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return value;
}
