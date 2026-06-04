import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";
import { aiDebugLog, createAiTraceId } from "@/services/ai-debug-log";
import { agentService, defaultAgentProfiles, mapAgentApproval, mapAgentDetail, mapAgentSummary, mapAgentTimelineEvent } from "@/services/agents";
import { aiChatService } from "@/services/ai-chat";
import { authService } from "@/services/auth";
import { pollingService } from "@/services/polling";
import { pushService } from "@/services/push";
import { realtimeService } from "@/services/realtime";
import { updateService } from "@/services/updates";
import type { AgentApprovalRequest, AgentDetail, AgentInstructionRequest, AgentProfile, AgentSpawnRequest, AgentStatus, AgentSummary, AgentTimelineEvent, AiChatAttachment, AiChatFile, AiChatMessage, AiChatModel, AiChatThread, AiChatTimelineEvent, AiDebugLogEntry, ConnectorCatalogItem, RootsEvent, ServiceStatus, UserInfo } from "@/services/types";

type AppState = {
  session: {
    isAuthenticated: boolean;
    isRestoring: boolean;
    user?: UserInfo;
  };
  realtime: {
    status: ServiceStatus;
    detail?: string;
  };
  push: {
    token?: string;
    permissionStatus: string;
  };
  connectors: {
    items: ConnectorCatalogItem[];
    isLoading: boolean;
    error?: string;
  };
  polling: {
    status: "idle" | "running" | "disabled" | "error";
  };
  updates: {
    status: string;
    version?: string;
    url?: string;
    notes?: string;
  };
  aiChat: {
    models: AiChatModel[];
    selectedModelId?: string;
    threads: AiChatThread[];
    messagesByThread: Record<string, AiChatMessage[]>;
    timelineEventsByThread: Record<string, AiChatTimelineEvent[]>;
    isLoadingModels: boolean;
    isLoadingThreads: boolean;
    loadingThreadId?: string;
    streamingThreadId?: string;
    error?: string;
  };
  agents: {
    items: AgentSummary[];
    profiles: AgentProfile[];
    detailsById: Record<string, AgentDetail>;
    pendingApprovals: AgentApprovalRequest[];
    isLoading: boolean;
    apiUnavailable: boolean;
    loadingAgentId?: string;
    error?: string;
  };
  aiDebug: {
    logs: AiDebugLogEntry[];
  };
  actions: {
    bootstrap: () => void;
    checkForUpdates: () => void;
    openUpdate: () => Promise<void>;
    clearAiDebugLogs: () => void;
    completeLogin: (accessToken: string, refreshToken?: string) => Promise<void>;
    createAiThread: () => Promise<AiChatThread>;
    loadAiModels: () => Promise<AiChatModel[]>;
    loadAiMessages: (threadId: string) => Promise<AiChatMessage[]>;
    loadAiTimelineEvents: (threadId: string) => Promise<AiChatTimelineEvent[]>;
    loadAiThreads: () => Promise<AiChatThread[]>;
    loginEmail: (email: string, password: string) => Promise<void>;
    prefetchUser: () => Promise<UserInfo | undefined>;
    refreshConnectors: () => Promise<ConnectorCatalogItem[]>;
    refreshUser: () => Promise<UserInfo>;
    registerEmail: (email: string, password: string, displayName: string) => Promise<void>;
    selectAiModel: (modelId: string) => void;
    deleteAiThread: (threadId: string) => Promise<void>;
    renameAiThread: (threadId: string, title: string) => Promise<AiChatThread>;
    respondToAiConfirmation: (confirmationId: string, accepted: boolean) => Promise<void>;
    loadAgents: () => Promise<AgentSummary[]>;
    loadAgentProfiles: () => Promise<AgentProfile[]>;
    loadAgentDetail: (agentId: string) => Promise<AgentDetail>;
    spawnAgent: (request: AgentSpawnRequest) => Promise<AgentDetail>;
    pauseAgent: (agentId: string) => Promise<void>;
    resumeAgent: (agentId: string) => Promise<void>;
    stopAgent: (agentId: string) => Promise<void>;
    sendAgentInstruction: (agentId: string, request: AgentInstructionRequest) => Promise<void>;
    respondToAgentApproval: (approvalId: string, accepted: boolean) => Promise<void>;
    sendAiMessage: (threadId: string, content: string, attachments?: AiChatAttachment[]) => Promise<void>;
    signOut: () => Promise<void>;
    uploadAiFile: (file: { uri: string; name: string; mimeType?: string }) => Promise<AiChatFile>;
  };
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [realtimeStatus, setRealtimeStatus] = useState<ServiceStatus>("idle");
  const [realtimeDetail, setRealtimeDetail] = useState<string | undefined>();
  const [pushToken, setPushToken] = useState<string | undefined>();
  const [pushPermission, setPushPermission] = useState("not requested");
  const [connectors, setConnectors] = useState<ConnectorCatalogItem[]>([]);
  const [connectorsLoading, setConnectorsLoading] = useState(false);
  const [connectorsError, setConnectorsError] = useState<string | undefined>();
  const [pollingStatus, setPollingStatus] = useState<"idle" | "running" | "disabled" | "error">("idle");
  const [updateStatus, setUpdateStatus] = useState("idle");
  const [availableUpdate, setAvailableUpdate] = useState<{ version?: string; url?: string; notes?: string } | undefined>();
  const [user, setUser] = useState<UserInfo | undefined>();
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [aiModels, setAiModels] = useState<AiChatModel[]>([]);
  const [selectedAiModelId, setSelectedAiModelId] = useState<string | undefined>();
  const [aiThreads, setAiThreads] = useState<AiChatThread[]>([]);
  const [aiMessagesByThread, setAiMessagesByThread] = useState<Record<string, AiChatMessage[]>>({});
  const [aiTimelineEventsByThread, setAiTimelineEventsByThread] = useState<Record<string, AiChatTimelineEvent[]>>({});
  const [isLoadingAiModels, setIsLoadingAiModels] = useState(false);
  const [isLoadingAiThreads, setIsLoadingAiThreads] = useState(false);
  const [loadingAiThreadId, setLoadingAiThreadId] = useState<string | undefined>();
  const [streamingAiThreadId, setStreamingAiThreadId] = useState<string | undefined>();
  const [aiChatError, setAiChatError] = useState<string | undefined>();
  const [aiDebugLogs, setAiDebugLogs] = useState<AiDebugLogEntry[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [agentProfiles, setAgentProfiles] = useState<AgentProfile[]>(defaultAgentProfiles);
  const [agentDetailsById, setAgentDetailsById] = useState<Record<string, AgentDetail>>({});
  const [pendingAgentApprovals, setPendingAgentApprovals] = useState<AgentApprovalRequest[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agentApiUnavailable, setAgentApiUnavailable] = useState(false);
  const [loadingAgentId, setLoadingAgentId] = useState<string | undefined>();
  const [agentsError, setAgentsError] = useState<string | undefined>();
  const userRefreshPromise = useRef<Promise<UserInfo> | null>(null);
  const connectorsRefreshPromise = useRef<Promise<ConnectorCatalogItem[]> | null>(null);
  const aiModelsPromise = useRef<Promise<AiChatModel[]> | null>(null);
  const aiThreadsPromise = useRef<Promise<AiChatThread[]> | null>(null);
  const agentsPromise = useRef<Promise<AgentSummary[]> | null>(null);
  const agentProfilesPromise = useRef<Promise<AgentProfile[]> | null>(null);
  const autoUpdateStarted = useRef(false);
  const bootstrappedUserId = useRef<string | undefined>(undefined);
  const pushRefreshUnsubscribe = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (autoUpdateStarted.current) {
      return;
    }

    autoUpdateStarted.current = true;
    setUpdateStatus("checking");
    void updateService
      .checkForApkUpdate()
      .then((result) => {
        setUpdateStatus(result.status);
        setAvailableUpdate(result.available ? { version: result.version, url: result.url, notes: result.notes } : undefined);
      })
      .catch(() => setUpdateStatus("error"));
  }, []);

  useEffect(() => {
    return aiDebugLog.subscribe(setAiDebugLogs);
  }, []);

  useEffect(() => {
    return realtimeService.subscribe((event) => {
      handleAgentRealtimeEvent(event);
      if (event.type === "WebSocketClosed") {
        const payload = event.payload as { code?: number; reason?: string; wasClean?: boolean };
        setRealtimeDetail(`closed ${payload.code ?? "unknown"}${payload.reason ? `: ${payload.reason}` : ""}`);
        return;
      }
      if (event.type === "WebSocketError") {
        setRealtimeDetail("websocket error");
        return;
      }
      setRealtimeDetail(event.type);
    });
  // handleAgentRealtimeEvent intentionally uses the current state merge closures.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!user) {
      bootstrappedUserId.current = undefined;
      return;
    }

    void bootstrapAuthenticatedServices(user);
  // bootstrapAuthenticatedServices is intentionally kept with the current render state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const subscription = RNAppState.addEventListener("change", (state) => {
      if (state === "active" && user) {
        void bootstrapAuthenticatedServices(user);
      }
    });

    return () => subscription.remove();
  // bootstrapAuthenticatedServices is intentionally kept with the current render state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const bootstrapAuthenticatedServices = async (nextUser: UserInfo) => {
    if (bootstrappedUserId.current === nextUser.userId) {
      return;
    }

    bootstrappedUserId.current = nextUser.userId;
    realtimeService.subscribeStatus(setRealtimeStatus);
    void realtimeService.connectChat().catch(() => setRealtimeStatus("error"));

    void pushService
      .requestToken()
      .then(async (result) => {
        setPushToken(result.token);
        setPushPermission(result.permissionStatus);
        if (result.token && nextUser.userId) {
          await pushService.registerDevice(nextUser.userId, result.token);
          setPushPermission("registered");
        }
      })
      .catch(() => setPushPermission("error"));

    pushRefreshUnsubscribe.current?.();
    pushRefreshUnsubscribe.current = pushService.onTokenRefresh((token) => {
      setPushToken(token);
      if (nextUser.userId) {
        void pushService
          .registerDevice(nextUser.userId, token)
          .then(() => setPushPermission("registered"))
          .catch(() => setPushPermission("registration-error"));
      }
    });

    setPollingStatus(pollingService.start() ? "running" : "disabled");
    void loadAiModelsAction().catch(() => undefined);
    void loadAiThreadsAction().catch(() => undefined);
    void refreshConnectorsAction().catch(() => undefined);
    void loadAgentProfilesAction().catch(() => undefined);
    void loadAgentsAction().catch(() => undefined);
  };

  const clearAiState = () => {
    setAiModels([]);
    setSelectedAiModelId(undefined);
    setAiThreads([]);
    setAiMessagesByThread({});
    setAiTimelineEventsByThread({});
    setAiChatError(undefined);
    aiModelsPromise.current = null;
    aiThreadsPromise.current = null;
  };

  const clearAgentState = () => {
    setAgents([]);
    setAgentProfiles(defaultAgentProfiles);
    setAgentDetailsById({});
    setPendingAgentApprovals([]);
    setAgentApiUnavailable(false);
    setAgentsError(undefined);
    agentsPromise.current = null;
    agentProfilesPromise.current = null;
  };

  const refreshConnectorsAction = async () => {
    if (!connectorsRefreshPromise.current) {
      setConnectorsLoading(true);
      setConnectorsError(undefined);
      connectorsRefreshPromise.current = authService
        .listConnectors()
        .then((nextConnectors) => {
          setConnectors(nextConnectors);
          return nextConnectors;
        })
        .catch((err) => {
          setConnectorsError(err instanceof Error ? err.message : "Could not load Nexus connectors.");
          throw err;
        })
        .finally(() => {
          connectorsRefreshPromise.current = null;
          setConnectorsLoading(false);
        });
    }

    return connectorsRefreshPromise.current;
  };

  const loadAiModelsAction = async () => {
    if (aiModels.length) {
      return aiModels;
    }
    if (!aiModelsPromise.current) {
      setIsLoadingAiModels(true);
      setAiChatError(undefined);
      aiModelsPromise.current = aiChatService
        .listModels()
        .then((models) => {
          setAiModels(models);
          setSelectedAiModelId((current) => current ?? models.find((model) => model.defaultModel)?.id ?? models[0]?.id);
          return models;
        })
        .catch((err) => {
          setAiChatError(err instanceof Error ? err.message : "Could not load AI models.");
          throw err;
        })
        .finally(() => {
          aiModelsPromise.current = null;
          setIsLoadingAiModels(false);
        });
    }
    return aiModelsPromise.current;
  };

  const loadAiThreadsAction = async () => {
    if (aiThreads.length) {
      return aiThreads;
    }
    if (!aiThreadsPromise.current) {
      setIsLoadingAiThreads(true);
      setAiChatError(undefined);
      aiThreadsPromise.current = aiChatService
        .listThreads()
        .then((threads) => {
          setAiThreads(threads);
          return threads;
        })
        .catch((err) => {
          setAiChatError(err instanceof Error ? err.message : "Could not load AI threads.");
          throw err;
        })
        .finally(() => {
          aiThreadsPromise.current = null;
          setIsLoadingAiThreads(false);
        });
    }
    return aiThreadsPromise.current;
  };

  const loadAgentsAction = async () => {
    if (agents.length) {
      return agents;
    }
    if (!agentsPromise.current) {
      setIsLoadingAgents(true);
      setAgentsError(undefined);
      agentsPromise.current = agentService
        .listAgents()
        .then((nextAgents) => {
          setAgentApiUnavailable(false);
          setAgents(nextAgents);
          return nextAgents;
        })
        .catch((err) => {
          if (isAgentApiUnavailableError(err)) {
            setAgentApiUnavailable(true);
            setAgentsError(undefined);
            return [];
          }
          setAgentsError(err instanceof Error ? err.message : "Could not load agents.");
          throw err;
        })
        .finally(() => {
          agentsPromise.current = null;
          setIsLoadingAgents(false);
        });
    }
    return agentsPromise.current;
  };

  const loadAgentProfilesAction = async () => {
    if (!agentProfilesPromise.current) {
      agentProfilesPromise.current = agentService
        .listProfiles()
        .then((profiles) => {
          setAgentProfiles(profiles);
          return profiles;
        })
        .catch(() => defaultAgentProfiles)
        .finally(() => {
          agentProfilesPromise.current = null;
        });
    }
    return agentProfilesPromise.current;
  };

  const handleAgentRealtimeEvent = (event: RootsEvent) => {
    if (!event.type.startsWith("agent.")) {
      return;
    }

    if (event.type === "agent.status_changed") {
      const summary = mapAgentSummary(event.payload);
      if (summary.id) {
        mergeAgentSummaryState(summary);
      }
      return;
    }

    if (event.type === "agent.blackboard_updated") {
      const detail = mapAgentDetail(event.payload);
      if (detail.id) {
        mergeAgentDetailState(detail);
      }
      return;
    }

    if (event.type === "agent.timeline_event" || event.type === "agent.message_created") {
      const timelineEvent = mapAgentTimelineEvent(event.payload, "");
      if (timelineEvent.agentId) {
        appendAgentTimelineState(timelineEvent);
      }
      return;
    }

    if (event.type === "agent.approval_requested") {
      const approval = mapAgentApproval(event.payload);
      if (approval.id) {
        upsertAgentApprovalState(approval);
      }
      return;
    }

    if (event.type === "agent.approval_resolved") {
      const approval = mapAgentApproval(event.payload);
      if (approval.id) {
        resolveAgentApprovalState(approval);
      }
    }
  };

  const mergeAgentSummaryState = (summary: AgentSummary) => {
    setAgents((current) => mergeAgentSummaryList(current, summary));
    setAgentDetailsById((current) => {
      const existing = current[summary.id];
      return existing ? { ...current, [summary.id]: { ...existing, ...summary } } : current;
    });
  };

  const mergeAgentDetailState = (detail: AgentDetail) => {
    setAgents((current) => mergeAgentSummaryList(current, detail));
    setAgentDetailsById((current) => ({ ...current, [detail.id]: detail }));
    setPendingAgentApprovals((current) => mergeApprovalList(current, detail.approvals.filter((approval) => approval.status === "pending")));
  };

  const appendAgentTimelineState = (event: AgentTimelineEvent) => {
    setAgentDetailsById((current) => {
      const detail = current[event.agentId];
      if (!detail) {
        return current;
      }
      return {
        ...current,
        [event.agentId]: {
          ...detail,
          timeline: mergeAgentTimelineEvents(detail.timeline, [event]),
          lastUpdate: event.body ?? event.title,
          updatedAt: event.createdAt
        }
      };
    });
    setAgents((current) => touchAgentSummary(current, event.agentId, { lastUpdate: event.body ?? event.title, updatedAt: event.createdAt }));
  };

  const upsertAgentApprovalState = (approval: AgentApprovalRequest) => {
    setPendingAgentApprovals((current) => mergeApprovalList(current, [approval]).filter((item) => item.status === "pending"));
    setAgentDetailsById((current) => {
      const detail = current[approval.agentId];
      if (!detail) {
        return current;
      }
      return {
        ...current,
        [approval.agentId]: {
          ...detail,
          approvals: mergeApprovalList(detail.approvals, [approval]),
          needsAttention: true,
          status: detail.status === "running" ? "waiting_input" : detail.status
        }
      };
    });
    setAgents((current) => touchAgentSummary(current, approval.agentId, { needsAttention: true, status: "waiting_input", lastUpdate: approval.title, updatedAt: approval.requestedAt }));
  };

  const resolveAgentApprovalState = (approval: AgentApprovalRequest) => {
    setPendingAgentApprovals((current) => current.filter((item) => item.id !== approval.id));
    setAgentDetailsById((current) => updateDetailApproval(current, approval));
  };

  const runAgentControl = async (agentId: string, status: AgentStatus, action: () => Promise<AgentDetail | undefined>) => {
    const previousAgents = agents;
    const previousDetail = agentDetailsById[agentId];
    setAgents((current) => touchAgentSummary(current, agentId, { status }));
    setAgentDetailsById((current) => (current[agentId] ? { ...current, [agentId]: { ...current[agentId], status } } : current));
    try {
      const detail = await action();
      if (detail) {
        mergeAgentDetailState(detail);
      }
    } catch (err) {
      setAgents(previousAgents);
      if (previousDetail) {
        setAgentDetailsById((current) => ({ ...current, [agentId]: previousDetail }));
      }
      setAgentsError(err instanceof Error ? err.message : "Could not update agent.");
      throw err;
    }
  };

  const setLocalAgentStatus = (agentId: string, status: AgentStatus) => {
    const now = new Date().toISOString();
    const label = status === "running" ? "Local draft resumed" : status === "paused" ? "Local draft paused" : "Local draft stopped";
    setAgents((current) => touchAgentSummary(current, agentId, { status, lastUpdate: label, updatedAt: now }));
    setAgentDetailsById((current) => {
      const detail = current[agentId];
      if (!detail) {
        return current;
      }
      return {
        ...current,
        [agentId]: {
          ...detail,
          status,
          lastUpdate: label,
          updatedAt: now,
          timeline: mergeAgentTimelineEvents(detail.timeline, [
            {
              id: `${agentId}-${status}-${Date.now()}`,
              agentId,
              type: "log",
              title: label,
              body: "This update is local because Nexus has not exposed the agent control API yet.",
              createdAt: now
            }
          ])
        }
      };
    });
  };

  const value = useMemo<AppState>(
    () => ({
      session: {
        isAuthenticated: Boolean(user),
        isRestoring: isRestoringSession,
        user
      },
      realtime: {
        status: realtimeStatus,
        detail: realtimeDetail
      },
      push: {
        token: pushToken,
        permissionStatus: pushPermission
      },
      connectors: {
        items: connectors,
        isLoading: connectorsLoading,
        error: connectorsError
      },
      polling: {
        status: pollingStatus
      },
      updates: {
        status: updateStatus,
        version: availableUpdate?.version,
        url: availableUpdate?.url,
        notes: availableUpdate?.notes
      },
      aiChat: {
        models: aiModels,
        selectedModelId: selectedAiModelId,
        threads: aiThreads,
        messagesByThread: aiMessagesByThread,
        timelineEventsByThread: aiTimelineEventsByThread,
        isLoadingModels: isLoadingAiModels,
        isLoadingThreads: isLoadingAiThreads,
        loadingThreadId: loadingAiThreadId,
        streamingThreadId: streamingAiThreadId,
        error: aiChatError
      },
      agents: {
        items: agents,
        profiles: agentProfiles,
        detailsById: agentDetailsById,
        pendingApprovals: pendingAgentApprovals,
        isLoading: isLoadingAgents,
        apiUnavailable: agentApiUnavailable,
        loadingAgentId,
        error: agentsError
      },
      aiDebug: {
        logs: aiDebugLogs
      },
      actions: {
        bootstrap: () => {
          if (user) {
            void bootstrapAuthenticatedServices(user);
          }
        },
        checkForUpdates: () => {
          setUpdateStatus("checking");
          void updateService
            .checkForApkUpdate()
            .then((result) => {
              setUpdateStatus(result.status);
              setAvailableUpdate(result.available ? { version: result.version, url: result.url, notes: result.notes } : undefined);
            })
            .catch(() => setUpdateStatus("error"));
        },
        openUpdate: async () => {
          if (!availableUpdate?.url) {
            return;
          }
          await updateService.openUpdate(availableUpdate.url);
        },
        clearAiDebugLogs: () => {
          aiDebugLog.clear();
        },
        completeLogin: async (accessToken: string, refreshToken?: string) => {
          const nextUser = await authService.completeLogin({ accessToken, refreshToken, tokenType: "Bearer" });
          setUser(nextUser);
        },
        createAiThread: async () => {
          setAiChatError(undefined);
          const thread = await aiChatService.createThread();
          setAiThreads((current) => mergeThread(current, thread));
          setAiMessagesByThread((current) => ({ ...current, [thread.id]: current[thread.id] ?? [] }));
          setAiTimelineEventsByThread((current) => ({ ...current, [thread.id]: current[thread.id] ?? [] }));
          return thread;
        },
        loadAiModels: async () => {
          return loadAiModelsAction();
        },
        loadAiMessages: async (threadId: string) => {
          setLoadingAiThreadId(threadId);
          try {
            const messages = await aiChatService.listMessages(threadId);
            setAiMessagesByThread((current) => ({ ...current, [threadId]: messages }));
            return messages;
          } catch (err) {
            throw err;
          } finally {
            setLoadingAiThreadId(undefined);
          }
        },
        loadAiTimelineEvents: async (threadId: string) => {
          setLoadingAiThreadId(threadId);
          try {
            const events = await aiChatService.listTimelineEvents(threadId);
            setAiTimelineEventsByThread((current) => ({ ...current, [threadId]: mergeTimelineEvents(current[threadId] ?? [], events) }));
            return events;
          } catch (err) {
            throw err;
          } finally {
            setLoadingAiThreadId(undefined);
          }
        },
        loadAiThreads: async () => {
          return loadAiThreadsAction();
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
        refreshConnectors: async () => {
          return refreshConnectorsAction();
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
        selectAiModel: (modelId: string) => {
          setSelectedAiModelId(modelId);
        },
        deleteAiThread: async (threadId: string) => {
          setAiChatError(undefined);
          const previousThreads = aiThreads;
          const previousMessages = aiMessagesByThread[threadId];
          const previousTimelineEvents = aiTimelineEventsByThread[threadId];
          setAiThreads((current) => current.filter((thread) => thread.id !== threadId));
          setAiMessagesByThread((current) => omitRecordKey(current, threadId));
          setAiTimelineEventsByThread((current) => omitRecordKey(current, threadId));
          if (streamingAiThreadId === threadId) {
            setStreamingAiThreadId(undefined);
          }
          try {
            await aiChatService.deleteThread(threadId);
          } catch (err) {
            setAiThreads(previousThreads);
            if (previousMessages) {
              setAiMessagesByThread((current) => ({ ...current, [threadId]: previousMessages }));
            }
            if (previousTimelineEvents) {
              setAiTimelineEventsByThread((current) => ({ ...current, [threadId]: previousTimelineEvents }));
            }
            if (streamingAiThreadId === threadId) {
              setStreamingAiThreadId(threadId);
            }
            setAiChatError(err instanceof Error ? err.message : "Could not delete thread.");
            throw err;
          }
        },
        renameAiThread: async (threadId: string, title: string) => {
          setAiChatError(undefined);
          const previousThread = aiThreads.find((thread) => thread.id === threadId);
          setAiThreads((current) => touchThread(current, threadId, { title }));
          try {
            const thread = await aiChatService.renameThread(threadId, title);
            setAiThreads((current) => mergeThread(current, thread));
            return thread;
          } catch (err) {
            if (previousThread) {
              setAiThreads((current) => mergeThread(current, previousThread));
            }
            setAiChatError(err instanceof Error ? err.message : "Could not rename thread.");
            throw err;
          }
        },
        respondToAiConfirmation: async (confirmationId: string, accepted: boolean) => {
          await aiChatService.respondToConfirmation(confirmationId, accepted);
        },
        loadAgents: async () => {
          return loadAgentsAction();
        },
        loadAgentProfiles: async () => {
          return loadAgentProfilesAction();
        },
        loadAgentDetail: async (agentId: string) => {
          setLoadingAgentId(agentId);
          setAgentsError(undefined);
          try {
            const detail = await agentService.getAgent(agentId);
            mergeAgentDetailState(detail);
            return detail;
          } catch (err) {
            if (isAgentApiUnavailableError(err) && agents.some((agent) => agent.id === agentId)) {
              setAgentApiUnavailable(true);
              throw err;
            }
            setAgentsError(err instanceof Error ? err.message : "Could not load agent.");
            throw err;
          } finally {
            setLoadingAgentId(undefined);
          }
        },
        spawnAgent: async (request: AgentSpawnRequest) => {
          setAgentsError(undefined);
          try {
            const detail = await agentService.spawnAgent(request);
            setAgentApiUnavailable(false);
            mergeAgentDetailState(detail);
            return detail;
          } catch (err) {
            if (isAgentApiUnavailableError(err)) {
              setAgentApiUnavailable(true);
              const detail = createLocalAgentDetail(request, agentProfiles);
              mergeAgentDetailState(detail);
              return detail;
            }
            setAgentsError(err instanceof Error ? err.message : "Could not spawn agent.");
            throw err;
          }
        },
        pauseAgent: async (agentId: string) => {
          if (isLocalAgentId(agentId)) {
            setLocalAgentStatus(agentId, "paused");
            return;
          }
          await runAgentControl(agentId, "paused", () => agentService.pauseAgent(agentId));
        },
        resumeAgent: async (agentId: string) => {
          if (isLocalAgentId(agentId)) {
            setLocalAgentStatus(agentId, "running");
            return;
          }
          await runAgentControl(agentId, "running", () => agentService.resumeAgent(agentId));
        },
        stopAgent: async (agentId: string) => {
          if (isLocalAgentId(agentId)) {
            setLocalAgentStatus(agentId, "completed");
            return;
          }
          await runAgentControl(agentId, "completed", () => agentService.stopAgent(agentId));
        },
        sendAgentInstruction: async (agentId: string, request: AgentInstructionRequest) => {
          setAgentsError(undefined);
          const optimisticEvent: AgentTimelineEvent = {
            id: `local-agent-message-${Date.now()}`,
            agentId,
            type: "message",
            title: "Instruction sent",
            body: request.message,
            createdAt: new Date().toISOString()
          };
          appendAgentTimelineState(optimisticEvent);
          if (isLocalAgentId(agentId)) {
            return;
          }
          try {
            const event = await agentService.sendInstruction(agentId, request);
            if (event) {
              appendAgentTimelineState(event);
            }
          } catch (err) {
            setAgentsError(err instanceof Error ? err.message : "Could not send instruction.");
            throw err;
          }
        },
        respondToAgentApproval: async (approvalId: string, accepted: boolean) => {
          const previousApprovals = pendingAgentApprovals;
          const approval = pendingAgentApprovals.find((item) => item.id === approvalId) ?? Object.values(agentDetailsById).flatMap((detail) => detail.approvals).find((item) => item.id === approvalId);
          if (approval) {
            resolveAgentApprovalState({ ...approval, status: accepted ? "approved" : "rejected" });
          }
          try {
            const nextApproval = await agentService.respondToApproval(approvalId, {
              accepted,
              respondedAt: new Date().toISOString()
            });
            if (nextApproval) {
              resolveAgentApprovalState(nextApproval);
            }
          } catch (err) {
            setPendingAgentApprovals(previousApprovals);
            setAgentsError(err instanceof Error ? err.message : "Could not respond to approval.");
            throw err;
          }
        },
        sendAiMessage: async (threadId: string, content: string, attachments?: AiChatAttachment[]) => {
          const now = new Date().toISOString();
          const traceId = createAiTraceId();
          const userMessage: AiChatMessage = {
            id: `local-user-${Date.now()}`,
            threadId,
            role: "user",
            content,
            createdAt: now,
            status: "sending"
          };
          const assistantMessage: AiChatMessage = {
            id: `local-assistant-${Date.now()}`,
            threadId,
            role: "assistant",
            content: "",
            createdAt: now,
            status: "streaming"
          };

          setAiChatError(undefined);
          aiDebugLog.add({
            event: "send.started",
            traceId,
            metadata: {
              threadId,
              promptLength: content.length,
              attachmentCount: attachments?.length ?? 0,
              existingMessageCount: (aiMessagesByThread[threadId] ?? []).length
            }
          });
          setStreamingAiThreadId(threadId);
          setAiMessagesByThread((current) => ({
            ...current,
            [threadId]: [...(current[threadId] ?? []), userMessage, assistantMessage]
          }));
          const priorMessages = aiMessagesByThread[threadId] ?? [];
          setAiThreads((current) =>
            touchThread(current, threadId, {
              title: current.find((thread) => thread.id === threadId)?.title === "New chat" ? titleFromPrompt(content) : undefined,
              preview: content,
              lastActivityAt: now,
              status: "streaming"
            })
          );

          try {
            let receivedAssistantContent = false;
            const modelId = selectedAiModelId ?? aiModels.find((model) => model.defaultModel)?.id ?? aiModels[0]?.id;
            aiDebugLog.add({
              event: "model.selected",
              traceId,
              modelId,
              metadata: { selectedModelId: selectedAiModelId, availableModels: aiModels.length }
            });
            await aiChatService.sendMessageStream({
              threadId,
              modelId,
              traceId,
              attachments,
              messages: [...priorMessages.filter((message) => message.status !== "error"), userMessage],
              onEvent: (event) => {
                if (event.type === "thread") {
                  setAiThreads((current) => mergeThread(current, event.thread));
                  return;
                }
                if (event.type === "message") {
                  receivedAssistantContent = receivedAssistantContent || Boolean(event.message.content.trim());
                  setAiMessagesByThread((current) => replaceOrAppendMessage(current, threadId, event.message, assistantMessage.id));
                  return;
                }
            if (event.type === "delta") {
              receivedAssistantContent = receivedAssistantContent || Boolean(event.delta);
              setAiMessagesByThread((current) => appendAssistantDelta(current, threadId, assistantMessage.id, event.delta));
              return;
            }
                if (
                  event.type === "status" ||
                  event.type === "tool_call" ||
                  event.type === "tool_result" ||
                  event.type === "confirmation_request" ||
                  event.type === "confirmation_response" ||
                  event.type === "file" ||
                  event.type === "reference" ||
                  event.type === "usage"
                ) {
                  setAiTimelineEventsByThread((current) => appendTimelineEvent(current, threadId, event));
                  return;
                }
                if (event.type === "error") {
                  setAiTimelineEventsByThread((current) => appendTimelineEvent(current, threadId, event));
                  throw new Error(event.message);
                }
              }
            });
            if (!receivedAssistantContent) {
              aiDebugLog.add({
                level: "error",
                event: "send.empty_response",
                traceId,
                modelId,
                message: "Nexus AI returned an empty response."
              });
              throw new Error("Nexus AI returned an empty response.");
            }

            aiDebugLog.add({ event: "send.completed", traceId, modelId });
            setAiMessagesByThread((current) => markThreadMessagesSent(current, threadId));
            setAiThreads((current) => touchThread(current, threadId, { status: "idle", lastActivityAt: new Date().toISOString() }));
            void aiChatService
              .listMessages(threadId)
              .then((messages) => setAiMessagesByThread((current) => ({ ...current, [threadId]: messages })))
              .catch(() => undefined);
          } catch (err) {
            aiDebugLog.add({
              level: "error",
              event: "send.failed",
              traceId,
              message: err instanceof Error ? err.message : "Could not send message."
            });
            setAiChatError(err instanceof Error ? err.message : "Could not send message.");
            setAiMessagesByThread((current) => markThreadMessagesError(current, threadId));
            setAiThreads((current) => touchThread(current, threadId, { status: "error" }));
            throw err;
          } finally {
            setStreamingAiThreadId(undefined);
          }
        },
        signOut: async () => {
          await authService.signOut();
          pushRefreshUnsubscribe.current?.();
          pushRefreshUnsubscribe.current = undefined;
          pollingService.stop();
          await realtimeService.disconnect().catch(() => undefined);
          bootstrappedUserId.current = undefined;
          setUser(undefined);
          setPushToken(undefined);
          setPushPermission("not requested");
          setConnectors([]);
          setConnectorsError(undefined);
          connectorsRefreshPromise.current = null;
          setPollingStatus("idle");
          clearAiState();
          clearAgentState();
        },
        uploadAiFile: async (file) => {
          return aiChatService.uploadFile(file);
        }
      }
    }),
    // Action closures intentionally capture the current state snapshot used by optimistic UI updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentApiUnavailable, agentDetailsById, agents, agentsError, aiChatError, aiDebugLogs, aiMessagesByThread, aiModels, aiThreads, aiTimelineEventsByThread, availableUpdate, connectors, connectorsError, connectorsLoading, isLoadingAgents, isLoadingAiModels, isLoadingAiThreads, isRestoringSession, loadingAgentId, loadingAiThreadId, pendingAgentApprovals, pollingStatus, pushPermission, pushToken, realtimeDetail, realtimeStatus, selectedAiModelId, streamingAiThreadId, updateStatus, user]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

function mergeTimelineEvents(current: AiChatTimelineEvent[], incoming: AiChatTimelineEvent[]) {
  return [...current, ...incoming]
    .filter((event, index, all) => all.findIndex((item) => item.id === event.id) === index)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function mergeThread(current: AiChatThread[], thread: AiChatThread) {
  return [thread, ...current.filter((item) => item.id !== thread.id)].sort(sortThreads);
}

function touchThread(current: AiChatThread[], threadId: string, patch: Partial<AiChatThread>) {
  return current
    .map((thread) => (thread.id === threadId ? compactThreadPatch(thread, patch) : thread))
    .sort(sortThreads);
}

function omitRecordKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _omitted, ...rest } = record;
  return rest;
}

function compactThreadPatch(thread: AiChatThread, patch: Partial<AiChatThread>) {
  return {
    ...thread,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))
  } as AiChatThread;
}

function sortThreads(a: AiChatThread, b: AiChatThread) {
  return new Date(b.lastActivityAt ?? 0).getTime() - new Date(a.lastActivityAt ?? 0).getTime();
}

function replaceOrAppendMessage(current: Record<string, AiChatMessage[]>, threadId: string, message: AiChatMessage, fallbackId: string): Record<string, AiChatMessage[]> {
  const messages = current[threadId] ?? [];
  const existingIndex = messages.findIndex((item) => item.id === message.id || item.id === fallbackId);
  const nextMessage: AiChatMessage = { ...message, threadId, status: message.status ?? "sent" };

  if (existingIndex < 0) {
    return { ...current, [threadId]: [...messages, nextMessage] };
  }

  return {
    ...current,
    [threadId]: messages.map((item, index) => (index === existingIndex ? nextMessage : item))
  };
}

function appendAssistantDelta(current: Record<string, AiChatMessage[]>, threadId: string, messageId: string, delta: string): Record<string, AiChatMessage[]> {
  return {
    ...current,
    [threadId]: (current[threadId] ?? []).map((message) => (message.id === messageId ? { ...message, content: `${message.content}${delta}` } : message))
  };
}

function markThreadMessagesSent(current: Record<string, AiChatMessage[]>, threadId: string): Record<string, AiChatMessage[]> {
  return {
    ...current,
    [threadId]: (current[threadId] ?? []).map((message): AiChatMessage => (message.status === "sending" || message.status === "streaming" ? { ...message, status: "sent" } : message))
  };
}

function markThreadMessagesError(current: Record<string, AiChatMessage[]>, threadId: string): Record<string, AiChatMessage[]> {
  return {
    ...current,
    [threadId]: (current[threadId] ?? []).map((message): AiChatMessage => (message.status === "sending" || message.status === "streaming" ? { ...message, status: "error" } : message))
  };
}

function appendTimelineEvent(
  current: Record<string, AiChatTimelineEvent[]>,
  threadId: string,
  event: AiChatTimelineEvent["event"]
): Record<string, AiChatTimelineEvent[]> {
  const createdAt = new Date().toISOString();
  const eventId =
    event.type === "tool_call"
      ? event.toolCall.id
      : event.type === "tool_result"
        ? `${event.result.toolCallId}-result-${createdAt}`
        : event.type === "confirmation_request"
          ? event.confirmation.id
          : event.type === "confirmation_response"
            ? `${event.response.id}-response-${createdAt}`
            : `${event.type}-${createdAt}`;
  const timelineEvent: AiChatTimelineEvent = {
    id: eventId,
    threadId,
    createdAt,
    event
  };

  return {
    ...current,
    [threadId]: mergeTimelineEvents((current[threadId] ?? []).filter((item) => item.id !== eventId), [timelineEvent])
  };
}

function mergeAgentSummaryList(current: AgentSummary[], incoming: AgentSummary) {
  return [incoming, ...current.filter((agent) => agent.id !== incoming.id)].sort(sortAgents);
}

function touchAgentSummary(current: AgentSummary[], agentId: string, patch: Partial<AgentSummary>) {
  return current.map((agent) => (agent.id === agentId ? compactAgentPatch(agent, patch) : agent)).sort(sortAgents);
}

function compactAgentPatch(agent: AgentSummary, patch: Partial<AgentSummary>) {
  return {
    ...agent,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))
  } as AgentSummary;
}

function sortAgents(a: AgentSummary, b: AgentSummary) {
  const attentionDelta = Number(b.needsAttention) - Number(a.needsAttention);
  if (attentionDelta !== 0) {
    return attentionDelta;
  }
  return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
}

function mergeApprovalList(current: AgentApprovalRequest[], incoming: AgentApprovalRequest[]) {
  return [...incoming, ...current.filter((approval) => !incoming.some((item) => item.id === approval.id))].sort((a, b) => new Date(b.requestedAt ?? 0).getTime() - new Date(a.requestedAt ?? 0).getTime());
}

function mergeAgentTimelineEvents(current: AgentTimelineEvent[], incoming: AgentTimelineEvent[]) {
  return [...incoming, ...current.filter((event) => !incoming.some((item) => item.id === event.id))].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function updateDetailApproval(current: Record<string, AgentDetail>, approval: AgentApprovalRequest) {
  const detail = current[approval.agentId];
  if (!detail) {
    return current;
  }
  return {
    ...current,
    [approval.agentId]: {
      ...detail,
      approvals: mergeApprovalList(detail.approvals, [approval])
    }
  };
}

function createLocalAgentDetail(request: AgentSpawnRequest, profiles: AgentProfile[]): AgentDetail {
  const now = new Date().toISOString();
  const id = `local-agent-${Date.now()}`;
  const profile = profiles.find((item) => item.id === request.profileId) ?? profiles[0] ?? defaultAgentProfiles[0];
  return {
    id,
    name: profile.name,
    profileId: profile.id,
    profileName: profile.name,
    objective: request.objective || profile.defaultObjective,
    status: "idle",
    location: request.location ?? profile.location ?? "Pulse",
    runtime: request.runtime ?? profile.runtime ?? "Pending Nexus",
    needsAttention: false,
    lastUpdate: "Draft created locally. Nexus agent API is not available yet.",
    updatedAt: now,
    blackboard: {
      objective: request.objective || profile.defaultObjective,
      plan: [
        `Use the ${profile.name} blackboard profile`,
        ...(profile.capabilities.length ? profile.capabilities.map((capability) => `Apply ${capability}`) : ["Track progress and decisions"]),
        "Sync this objective when the Nexus agent API is available"
      ],
      activeStep: "Draft is staged in Pulse",
      decisions: profile.role ? [{ id: `${id}-profile`, title: `Selected ${profile.name}`, rationale: profile.role, createdAt: now }] : [],
      blockers: ["Nexus returned not found for the agent API contract"],
      artifacts: [],
      contextReferences: profile.description ? [{ id: `${id}-profile-reference`, title: profile.name, type: "profile", summary: profile.description }] : [],
      recentUpdates: [`Pulse staged this as a ${profile.name} profile draft.`],
      updatedAt: now
    },
    approvals: [],
    timeline: [
      {
        id: `${id}-created`,
        agentId: id,
        type: "blackboard",
        title: "Draft agent created",
        body: "Pulse kept this spawn request locally because Nexus has not exposed /api/v1/agents yet.",
        createdAt: now
      }
    ]
  };
}

function isLocalAgentId(agentId: string) {
  return agentId.startsWith("local-agent-");
}

function isAgentApiUnavailableError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return /404|not found|not_found/i.test(message);
}

function titleFromPrompt(content: string) {
  const trimmed = content.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "New chat";
  }
  return trimmed.length > 42 ? `${trimmed.slice(0, 39)}...` : trimmed;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return value;
}
