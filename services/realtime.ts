import { appConfig } from "@/config/app-config";
import { tokenStore } from "@/services/token-store";
import type { RootsEvent, ServiceStatus } from "@/services/types";

type RealtimeListener = (event: RootsEvent) => void;
type StatusListener = (status: ServiceStatus) => void;

type WebSocketMessage = {
  id?: string;
  type?: string;
  event?: string;
  payload?: unknown;
  data?: unknown;
  [key: string]: unknown;
};

type SocketTarget = {
  url: string;
  headers: Record<string, string>;
};

type ReactNativeWebSocketConstructor = {
  new (url: string, protocols?: string | string[] | null, options?: { headers: Record<string, string> }): WebSocket;
};

const reconnectDelayMs = 5000;

export class RealtimeService {
  private socket?: WebSocket;
  private connectPromise?: Promise<void>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private shouldReconnect = false;
  private listeners = new Set<RealtimeListener>();
  private statusListeners = new Set<StatusListener>();

  subscribe(listener: RealtimeListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  async connectChat() {
    return this.connectUserSocket();
  }

  async connectUserSocket() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.shouldReconnect = true;
    this.setStatus("connecting");
    this.connectPromise = this.openSocket().finally(() => {
      this.connectPromise = undefined;
    });

    return this.connectPromise;
  }

  async disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.socket?.close();
    this.socket = undefined;
    this.setStatus("idle");
  }

  async joinChannel(channelId: string) {
    this.send({ type: "join", channelId });
  }

  private async openSocket() {
    const target = await this.buildSocketTarget();

    await new Promise<void>((resolve, reject) => {
      const ReactNativeWebSocket = WebSocket as ReactNativeWebSocketConstructor;
      const socket = new ReactNativeWebSocket(target.url, null, { headers: target.headers });
      let settled = false;
      this.socket = socket;

      socket.onopen = () => {
        settled = true;
        this.setStatus("connected");
        resolve();
      };

      socket.onmessage = (message) => {
        this.handleMessage(message.data);
      };

      socket.onerror = (event) => {
        this.setStatus("error");
        this.emit("WebSocketError", { message: "User websocket failed.", readyState: socket.readyState, event });
        if (!settled) {
          settled = true;
          reject(new Error("User websocket failed."));
        }
      };

      socket.onclose = (event) => {
        if (this.socket === socket) {
          this.socket = undefined;
        }
        const authFailure = event.code === 1008 || event.code === 4001 || event.code === 4401 || event.code === 4403;
        const retry = this.shouldReconnect && !authFailure;
        this.setStatus(retry ? "degraded" : this.shouldReconnect ? "error" : "idle");
        this.emit("WebSocketClosed", { code: event.code, reason: event.reason, wasClean: event.wasClean });
        if (!settled) {
          settled = true;
          if (retry) {
            resolve();
          } else {
            reject(new Error(`User websocket closed before opening (${event.code}).`));
          }
        }
        if (retry) {
          this.scheduleReconnect();
        }
      };
    });
  }

  private async buildSocketTarget(): Promise<SocketTarget> {
    const base = new URL(appConfig.realtime.userSocket, appConfig.apiBaseUrl);
    base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
    const headers: Record<string, string> = {
      Accept: "application/json"
    };

    const token = await tokenStore.getAccessToken();
    if (token) {
      const bearerToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      headers.Authorization = bearerToken;
      base.searchParams.set("access_token", bearerToken.replace("Bearer ", ""));
    }

    return { url: base.toString(), headers };
  }

  private send(message: Record<string, unknown>) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  private handleMessage(data: unknown) {
    const message = parseMessage(data);
    this.emit(message.type ?? "message", message.payload ?? message.data ?? message);
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connectUserSocket().catch(() => undefined);
    }, reconnectDelayMs);
  }

  private emit(type: string, payload: unknown) {
    const event: RootsEvent = {
      id: `${type}-${Date.now()}`,
      source: "websocket",
      type,
      receivedAt: new Date().toISOString(),
      payload
    };
    this.listeners.forEach((listener) => listener(event));
  }

  private setStatus(status: ServiceStatus) {
    this.statusListeners.forEach((listener) => listener(status));
  }
}

export const realtimeService = new RealtimeService();

function parseMessage(data: unknown): WebSocketMessage {
  if (typeof data !== "string") {
    return { type: "message", payload: data };
  }

  try {
    const parsed = JSON.parse(data) as WebSocketMessage;
    return {
      ...parsed,
      type: parsed.type ?? parsed.event ?? "message"
    };
  } catch {
    return { type: "message", payload: data };
  }
}
