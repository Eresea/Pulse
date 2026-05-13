import * as Updates from "expo-updates";

export const updateService = {
  async checkAndFetch() {
    if (__DEV__) {
      return { status: "development", applied: false };
    }

    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) {
      return { status: "current", applied: false };
    }

    await Updates.fetchUpdateAsync();
    return { status: "ready-to-reload", applied: false };
  },

  async reload() {
    await Updates.reloadAsync();
  }
};
