import { appConfig } from "@/config/app-config";
import { rootsApi } from "@/services/roots-api";
import type { RootsEvent } from "@/services/types";

type PollingListener = (event: RootsEvent) => void;

export class PollingService {
  private timer?: ReturnType<typeof setInterval>;
  private listeners = new Set<PollingListener>();

  subscribe(listener: PollingListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start() {
    if (this.timer) {
      return true;
    }

    const endpoint = appConfig.sync.events;
    if (!endpoint) {
      return false;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, appConfig.pollingIntervalMs);
    return true;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async tick() {
    try {
      const endpoint = appConfig.sync.events;
      if (!endpoint) {
        this.stop();
        return;
      }
      await rootsApi.request<unknown>(endpoint);
      this.emit("poll-ok", { checkedAt: new Date().toISOString() });
    } catch (error) {
      this.emit("poll-error", error instanceof Error ? error.message : String(error));
    }
  }

  private emit(type: string, payload: unknown) {
    const event: RootsEvent = {
      id: `${type}-${Date.now()}`,
      source: "polling",
      type,
      receivedAt: new Date().toISOString(),
      payload
    };
    this.listeners.forEach((listener) => listener(event));
  }
}

export const pollingService = new PollingService();
