import { appConfig } from "@/config/app-config";
import { rootsApi } from "@/services/roots-api";
import { tokenStore } from "@/services/token-store";
import type { LoginEmailRequest, UserInfo } from "@/services/types";

export const authService = {
  async loginEmail(request: LoginEmailRequest): Promise<UserInfo> {
    return rootsApi.request<UserInfo>(appConfig.auth.loginEmail, {
      method: "POST",
      body: JSON.stringify({ Email: request.email, Password: request.password }),
      authenticated: false
    });
  },

  async refresh(): Promise<string | null> {
    const response = await rootsApi.request<{ authorization?: string }>(appConfig.auth.refresh, {
      method: "POST",
      body: JSON.stringify({})
    });
    if (response.authorization) {
      await tokenStore.setAccessToken(response.authorization);
      return response.authorization;
    }
    return null;
  },

  async signOut() {
    await tokenStore.clear();
  }
};
