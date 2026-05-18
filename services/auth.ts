import { appConfig } from "@/config/app-config";
import { rootsApi } from "@/services/roots-api";
import { tokenStore } from "@/services/token-store";
import type { ConnectedProvider, LoginEmailRequest, NexusAuthResult, NexusProvider, NexusUser, RegisterEmailRequest, UserInfo } from "@/services/types";

function mapNexusUser(user: NexusUser): UserInfo {
  const providers = user.connectedProviders ?? user.providers ?? user.externalLogins ?? [];

  return {
    userId: user.id ?? user.userId ?? "",
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.displayName ?? user.name ?? ([user.firstName, user.lastName].filter(Boolean).join(" ") || undefined),
    avatarUrl: user.avatarUrl ?? user.imageUrl ?? user.picture ?? user.avatar,
    emailVerified: user.emailVerified,
    providers: providers.map(mapProvider)
  };
}

function mapProvider(provider: NexusProvider): ConnectedProvider {
  const id = provider.id ?? provider.provider ?? provider.providerName ?? provider.name ?? provider.displayName ?? "unknown";
  return {
    id,
    name: provider.displayName ?? provider.providerName ?? provider.name ?? provider.provider ?? id,
    email: provider.email,
    connectedAt: provider.connectedAt
  };
}

async function storeAuthResult(result: NexusAuthResult) {
  if (result.mfaRequired) {
    throw new Error("Multi-factor authentication is required, but Pulse does not support MFA yet.");
  }
  if (!result.accessToken) {
    throw new Error("Nexus did not return an access token.");
  }
  await tokenStore.setAccessToken(result.tokenType === "Bearer" ? `Bearer ${result.accessToken}` : result.accessToken, expiresAtFromResult(result));
  if (result.refreshToken) {
    await tokenStore.setRefreshToken(result.refreshToken);
  }
}

function expiresAtFromResult(result: NexusAuthResult) {
  return result.expiresIn ? Date.now() + result.expiresIn * 1000 : undefined;
}

export const authService = {
  async loginEmail(request: LoginEmailRequest): Promise<UserInfo> {
    const result = await rootsApi.request<NexusAuthResult>(appConfig.auth.loginEmail, {
      method: "POST",
      body: JSON.stringify({ email: request.email, password: request.password, clientId: appConfig.auth.clientId }),
      authenticated: false
    });
    await storeAuthResult(result);
    return this.me();
  },

  async registerEmail(request: RegisterEmailRequest): Promise<void> {
    await rootsApi.request<{ userId: string; email: string; emailVerificationRequired: boolean }>(appConfig.auth.register, {
      method: "POST",
      body: JSON.stringify({ email: request.email, password: request.password, displayName: request.displayName }),
      authenticated: false
    });
  },

  async completeLogin(result: NexusAuthResult): Promise<UserInfo> {
    await storeAuthResult(result);
    return this.me();
  },

  async me(): Promise<UserInfo> {
    const user = await rootsApi.request<NexusUser>(appConfig.auth.me);
    return mapNexusUser(user);
  },

  async restoreSession(): Promise<UserInfo | undefined> {
    try {
      return await this.me();
    } catch {
      const accessToken = await this.refresh();
      if (!accessToken) {
        return undefined;
      }
      return this.me();
    }
  },

  async refresh(): Promise<string | null> {
    const refreshToken = await tokenStore.getRefreshToken();
    if (!refreshToken) {
      return null;
    }
    const response = await rootsApi.request<NexusAuthResult>(appConfig.auth.refresh, {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
      authenticated: false
    });
    if (response.accessToken) {
      await storeAuthResult(response);
      return response.tokenType === "Bearer" ? `Bearer ${response.accessToken}` : response.accessToken;
    }
    return null;
  },

  async signOut() {
    await rootsApi.request(appConfig.auth.logout, { method: "POST" }).catch(() => undefined);
    await tokenStore.clear();
  }
};
