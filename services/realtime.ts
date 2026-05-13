import * as signalR from "@microsoft/signalr";
import { appConfig } from "@/config/app-config";
import { tokenStore } from "@/services/token-store";
import type { RootsEvent, ServiceStatus } from "@/services/types";

type RealtimeListener = (event: RootsEvent) => void;
type StatusListener = (status: ServiceStatus) => void;

export class RealtimeService {
  private chatConnection?: signalR.HubConnection;
  private listeners = new Set<RealtimeListener>();
  private statusListeners = new Set<StatusListener>();

  subscribe(listener: RealtimeListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  async connectChat() {
    if (this.chatConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.setStatus("connecting");
    this.chatConnection = this.createConnection(appConfig.hubs.chat);

    this.chatConnection.on("ReceiveMessage", (payload: unknown) => {
      this.emit("ReceiveMessage", payload);
    });

    this.chatConnection.on("UserCameOnline", (payload: unknown) => {
      this.emit("UserCameOnline", payload);
    });

    this.chatConnection.on("UserWentOffline", (payload: unknown) => {
      this.emit("UserWentOffline", payload);
    });

    this.chatConnection.onreconnecting(() => this.setStatus("degraded"));
    this.chatConnection.onreconnected(() => this.setStatus("connected"));
    this.chatConnection.onclose(() => this.setStatus("idle"));

    await this.chatConnection.start();
    this.setStatus("connected");
  }

  async disconnect() {
    await this.chatConnection?.stop();
    this.setStatus("idle");
  }

  async joinChannel(channelId: string) {
    await this.chatConnection?.invoke("JoinChannel", channelId);
  }

  private createConnection(path: string) {
    return new signalR.HubConnectionBuilder()
      .withUrl(`${appConfig.apiBaseUrl}${path}`, {
        accessTokenFactory: async () => {
          const token = await tokenStore.getAccessToken();
          return token?.replace("Bearer ", "") ?? "";
        }
      })
      .withAutomaticReconnect()
      .build();
  }

  private emit(type: string, payload: unknown) {
    const event: RootsEvent = {
      id: `${type}-${Date.now()}`,
      source: "signalr",
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
