import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";
import { aiDebugLog, createAiTraceId } from "@/services/ai-debug-log";
import { aiChatService } from "@/services/ai-chat";
import { authService } from "@/services/auth";
import { pollingService } from "@/services/polling";
import { pushService } from "@/services/push";
import { realtimeService } from "@/services/realtime";
import { updateService } from "@/services/updates";
import type { AiChatMessage, AiChatModel, AiChatThread, AiChatTimelineEvent, AiDebugLogEntry, ServiceStatus, UserInfo } from "@/services/types";

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
  polling: {
    status: "idle" | "running" | "disabled" | "error";
  };
  updates: {
    status: string;
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
  aiDebug: {
    logs: AiDebugLogEntry[];
  };
  actions: {
    bootstrap: () => void;
    checkForUpdates: () => void;
    clearAiDebugLogs: () => void;
    completeLogin: (accessToken: string, refreshToken?: string) => Promise<void>;
    createAiThread: () => Promise<AiChatThread>;
    loadAiModels: () => Promise<AiChatModel[]>;
    loadAiMessages: (threadId: string) => Promise<AiChatMessage[]>;
    loadAiThreads: () => Promise<AiChatThread[]>;
    loginEmail: (email: string, password: string) => Promise<void>;
    prefetchUser: () => Promise<UserInfo | undefined>;
    refreshUser: () => Promise<UserInfo>;
    registerEmail: (email: string, password: string, displayName: string) => Promise<void>;
    selectAiModel: (modelId: string) => void;
    renameAiThread: (threadId: string, title: string) => Promise<AiChatThread>;
    sendAiMessage: (threadId: string, content: string) => Promise<void>;
    signOut: () => Promise<void>;
  };
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [realtimeStatus, setRealtimeStatus] = useState<ServiceStatus>("idle");
  const [realtimeDetail, setRealtimeDetail] = useState<string | undefined>();
  const [pushToken, setPushToken] = useState<string | undefined>();
  const [pushPermission, setPushPermission] = useState("not requested");
  const [pollingStatus, setPollingStatus] = useState<"idle" | "running" | "disabled" | "error">("idle");
  const [updateStatus, setUpdateStatus] = useState("idle");
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
  const userRefreshPromise = useRef<Promise<UserInfo> | null>(null);
  const aiModelsPromise = useRef<Promise<AiChatModel[]> | null>(null);
  const aiThreadsPromise = useRef<Promise<AiChatThread[]> | null>(null);
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
      .checkFetchAndReload()
      .then((result) => setUpdateStatus(result.status))
      .catch(() => setUpdateStatus("error"));
  }, []);

  useEffect(() => {
    return aiDebugLog.subscribe(setAiDebugLogs);
  }, []);

  useEffect(() => {
    return realtimeService.subscribe((event) => {
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
      polling: {
        status: pollingStatus
      },
      updates: {
        status: updateStatus
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
            .checkFetchAndMaybeReload(true)
            .then((result) => setUpdateStatus(result.status))
            .catch(() => setUpdateStatus("error"));
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
          setAiChatError(undefined);
          try {
            const messages = await aiChatService.listMessages(threadId);
            setAiMessagesByThread((current) => ({ ...current, [threadId]: messages }));
            return messages;
          } catch (err) {
            setAiChatError(err instanceof Error ? err.message : "Could not load chat messages.");
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
        sendAiMessage: async (threadId: string, content: string) => {
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
          setPollingStatus("idle");
          clearAiState();
        }
      }
    }),
    // Action closures intentionally capture the current state snapshot used by optimistic UI updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aiChatError, aiDebugLogs, aiMessagesByThread, aiModels, aiThreads, aiTimelineEventsByThread, isLoadingAiModels, isLoadingAiThreads, isRestoringSession, loadingAiThreadId, pollingStatus, pushPermission, pushToken, realtimeDetail, realtimeStatus, selectedAiModelId, streamingAiThreadId, updateStatus, user]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

function mergeThread(current: AiChatThread[], thread: AiChatThread) {
  return [thread, ...current.filter((item) => item.id !== thread.id)].sort(sortThreads);
}

function touchThread(current: AiChatThread[], threadId: string, patch: Partial<AiChatThread>) {
  return current
    .map((thread) => (thread.id === threadId ? compactThreadPatch(thread, patch) : thread))
    .sort(sortThreads);
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
    [threadId]: [...(current[threadId] ?? []).filter((item) => item.id !== eventId), timelineEvent]
  };
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
