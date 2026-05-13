import * as SecureStore from "expo-secure-store";

const accessTokenKey = "pulse.session.accessToken";

export const tokenStore = {
  async getAccessToken() {
    return SecureStore.getItemAsync(accessTokenKey);
  },

  async setAccessToken(token: string) {
    await SecureStore.setItemAsync(accessTokenKey, token);
  },

  async clear() {
    await SecureStore.deleteItemAsync(accessTokenKey);
  }
};
