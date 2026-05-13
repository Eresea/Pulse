import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { pollingService } from "@/services/polling";
import { pushService } from "@/services/push";
import { realtimeService } from "@/services/realtime";
import { updateService } from "@/services/updates";
import type { ServiceStatus } from "@/services/types";

type AppState = {
  session: {
    isAuthenticated: boolean;
    userId?: string;
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
  };
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [realtimeStatus, setRealtimeStatus] = useState<ServiceStatus>("idle");
  const [pushToken, setPushToken] = useState<string | undefined>();
  const [pushPermission, setPushPermission] = useState("not requested");
  const [pollingStatus, setPollingStatus] = useState<"idle" | "running" | "error">("idle");
  const [updateStatus, setUpdateStatus] = useState("idle");

  const value = useMemo<AppState>(
    () => ({
      session: {
        isAuthenticated: false
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
        }
      }
    }),
    [pollingStatus, pushPermission, pushToken, realtimeStatus, updateStatus]
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
