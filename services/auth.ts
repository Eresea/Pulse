import { appConfig } from "@/config/app-config";
import { rootsApi } from "@/services/roots-api";
import { tokenStore } from "@/services/token-store";
import type { LoginEmailRequest, NexusAuthResult, NexusUser, RegisterEmailRequest, UserInfo } from "@/services/types";

function mapNexusUser(user: NexusUser): UserInfo {
  return {
    userId: user.id,
    email: user.email,
    name: user.displayName
  };
}

async function storeAuthResult(result: NexusAuthResult) {
  if (result.mfaRequired) {
    throw new Error("Multi-factor authentication is required, but Pulse does not support MFA yet.");
  }
  if (!result.accessToken) {
    throw new Error("Nexus did not return an access token.");
  }
  await tokenStore.setAccessToken(result.tokenType === "Bearer" ? `Bearer ${result.accessToken}` : result.accessToken);
  if (result.refreshToken) {
    await tokenStore.setRefreshToken(result.refreshToken);
  }
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
