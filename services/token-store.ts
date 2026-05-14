import * as SecureStore from "expo-secure-store";

const accessTokenKey = "pulse.session.accessToken";
const refreshTokenKey = "pulse.session.refreshToken";

export const tokenStore = {
  async getAccessToken() {
    return SecureStore.getItemAsync(accessTokenKey);
  },

  async getRefreshToken() {
    return SecureStore.getItemAsync(refreshTokenKey);
  },

  async setAccessToken(token: string) {
    await SecureStore.setItemAsync(accessTokenKey, token);
  },

  async setRefreshToken(token: string) {
    await SecureStore.setItemAsync(refreshTokenKey, token);
  },

  async clear() {
    await SecureStore.deleteItemAsync(accessTokenKey);
    await SecureStore.deleteItemAsync(refreshTokenKey);
  }
};
