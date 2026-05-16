import * as Updates from "expo-updates";

type UpdateResult = {
  status: "development" | "current" | "ready-to-reload" | "reloading";
  applied: boolean;
};

export const updateService = {
  async checkAndFetch(): Promise<UpdateResult> {
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

  async checkFetchAndReload(): Promise<UpdateResult> {
    const result = await this.checkAndFetch();
    if (result.status !== "ready-to-reload") {
      return result;
    }

    await Updates.reloadAsync();
    return { status: "reloading", applied: true };
  },

  async reload() {
    await Updates.reloadAsync();
  }
};
