import { appConfig } from "@/config/app-config";
import { tokenStore } from "@/services/token-store";

type RequestOptions = RequestInit & {
  authenticated?: boolean;
};

export class RootsApi {
  constructor(private readonly baseUrl = appConfig.apiBaseUrl) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.fetch(path, options);
    return this.parseResponse<T>(response);
  }

  async authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
    return this.fetch(path, { ...options, authenticated: true });
  }

  private async fetch(path: string, options: RequestOptions) {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    if (options.body && !headers.has("Content-Type") && !(typeof FormData !== "undefined" && options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (options.authenticated !== false) {
      if (await tokenStore.isAccessTokenExpired()) {
        await this.refreshAccessToken();
      }
      const token = await tokenStore.getAccessToken();
      if (token) {
        headers.set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
      }
    }

    let response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers
    });

    const refreshedToken = response.headers.get("Authorization");
    if (refreshedToken) {
      await tokenStore.setAccessToken(refreshedToken);
    }

    if (response.status === 401 && options.authenticated !== false) {
      const nextToken = await this.refreshAccessToken();
      if (nextToken) {
        headers.set("Authorization", nextToken.startsWith("Bearer ") ? nextToken : `Bearer ${nextToken}`);
        response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers
        });

        const retryRefreshedToken = response.headers.get("Authorization");
        if (retryRefreshedToken) {
          await tokenStore.setAccessToken(retryRefreshedToken);
        }
      }
    }

    return response;
  }

  async refreshAccessToken() {
    const refreshToken = await tokenStore.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(`${this.baseUrl}${appConfig.auth.refresh}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { accessToken?: string; refreshToken?: string; tokenType?: string; expiresIn?: number };
    if (!result.accessToken) {
      return null;
    }

    const accessToken = result.tokenType === "Bearer" ? `Bearer ${result.accessToken}` : result.accessToken;
    await tokenStore.setAccessToken(accessToken, result.expiresIn ? Date.now() + result.expiresIn * 1000 : undefined);
    if (result.refreshToken) {
      await tokenStore.setRefreshToken(result.refreshToken);
    }
    return accessToken;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(formatApiError(detail) || `Roots API request failed with ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}

export const rootsApi = new RootsApi();

function formatApiError(detail: string) {
  if (!detail) {
    return "";
  }
  try {
    const payload = JSON.parse(detail) as { error?: string; message?: string };
    return payload.message ?? formatErrorCode(payload.error) ?? detail;
  } catch {
    return detail;
  }
}

function formatErrorCode(code?: string) {
  switch (code) {
    case "internal_error":
      return "Nexus returned an internal error.";
    case "invalid_request":
      return "Nexus rejected the request.";
    case "not_found":
      return "Nexus could not find the requested resource.";
    case "openrouter_not_configured":
      return "Nexus AI is not configured.";
    case "openrouter_upstream_error":
      return "Nexus AI provider returned an error.";
    case "openrouter_empty_response":
      return "Nexus AI provider returned an empty response.";
    case "unauthorized":
      return "Your Nexus session is not authorized.";
    default:
      return code;
  }
}
