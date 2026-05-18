import * as SecureStore from "expo-secure-store";

const accessTokenKey = "pulse.session.accessToken";
const refreshTokenKey = "pulse.session.refreshToken";
const accessTokenExpiresAtKey = "pulse.session.accessTokenExpiresAt";

export const tokenStore = {
  async getAccessToken() {
    return SecureStore.getItemAsync(accessTokenKey);
  },

  async getRefreshToken() {
    return SecureStore.getItemAsync(refreshTokenKey);
  },

  async getAccessTokenExpiresAt() {
    const value = await SecureStore.getItemAsync(accessTokenExpiresAtKey);
    return value ? Number(value) : undefined;
  },

  async isAccessTokenExpired(skewMs = 60000) {
    const expiresAt = await this.getAccessTokenExpiresAt();
    return Boolean(expiresAt && Date.now() + skewMs >= expiresAt);
  },

  async setAccessToken(token: string, expiresAt?: number) {
    await SecureStore.setItemAsync(accessTokenKey, token);
    if (expiresAt) {
      await SecureStore.setItemAsync(accessTokenExpiresAtKey, String(expiresAt));
    } else {
      await SecureStore.deleteItemAsync(accessTokenExpiresAtKey);
    }
  },

  async setRefreshToken(token: string) {
    await SecureStore.setItemAsync(refreshTokenKey, token);
  },

  async clear() {
    await SecureStore.deleteItemAsync(accessTokenKey);
    await SecureStore.deleteItemAsync(refreshTokenKey);
    await SecureStore.deleteItemAsync(accessTokenExpiresAtKey);
  }
};
