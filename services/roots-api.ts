import { appConfig } from "@/config/app-config";
import { tokenStore } from "@/services/token-store";

type RequestOptions = RequestInit & {
  authenticated?: boolean;
};

export class RootsApi {
  constructor(private readonly baseUrl = appConfig.apiBaseUrl) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (options.authenticated !== false) {
      const token = await tokenStore.getAccessToken();
      if (token) {
        headers.set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers
    });

    const refreshedToken = response.headers.get("Authorization");
    if (refreshedToken) {
      await tokenStore.setAccessToken(refreshedToken);
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Roots API request failed with ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}

export const rootsApi = new RootsApi();
